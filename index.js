const crypto = require("crypto");

// Used for generating a random BigInt between (and including) min and max
function randomBigIntBetween(min, max) {
    if (min > max) throw new Error("min > max");

    // Determine the range and calculate the bit/byte length needed
    const range = max - min + 1n;
    const bitLength = range.toString(2).length;
    const byteLength = Math.ceil(bitLength / 8);

    // Generate secure random bytes, convert to BigInt, and loop until it's in range
    let random;
    do {
        const bytes = crypto.randomBytes(byteLength);
        random = BigInt("0x" + bytes.toString("hex"));
    } while (random >= range);

    // Offset into the correct range and return
    return random + min;
}

// Generates a random BigInt with exactly bits bits, ensuring it's a probable odd candidate for a prime
function randomBigInt(bits) {

    // Calculate bytes from bits and generates enough random bytes
    const bytes = Math.ceil(bits / 8);
    const buffer = crypto.randomBytes(bytes);
    let bigint = BigInt("0x" + buffer.toString("hex"));

    // Shifts off an excess bits
    const extraBits = bytes * 8 - bits;
    bigint = bigint >> BigInt(extraBits);

    //Forces number to be odd and of the correct bit-length before returning
    bigint = bigint | 1n;
    bigint = bigint | (1n << BigInt(bits - 1));
    return bigint;
}

// Recreates the Miller-Rabin primality test. Determines if number n is probably prime
// A much higher k value is required in production environments
function isProbablePrime(n, k = 5) {

    // Perform trivial checks, (i.e. n === 2, n === 3, n === 1, n % 2 === 0)
    if (n === 2n || n === 3n) return true;
    if (n === 1n) return false;
    if (n < 2n || n % 2n === 0n) return false;

    // Determine s and d values 
    let s = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        d /= 2n;
        s += 1n;
  }

    // WitnessLoop for Miller-Rabin primality test
    WitnessLoop: for (let i = 0n; i < k; i++) {

        // Generate a random base
        const a = randomBigIntBetween(2n, n - 2n);

        // Compute x = a^d % n
        let x = modPow(a, d, n);

        // If x ==1 || x == n=1, this base bases
        if (x === 1n || x === n - 1n) continue;

        // Otherwise, square x up to s-1
        for (let r = 1n; r < s; r++) {
        x = modPow(x, 2n, n);
        if (x === n - 1n) continue WitnessLoop;
        }

        // Composite detected
        return false;
    }
    
    //Probably prime
    return true;
}

// Efficiently computes (base^exp) mod mod using exponentiation by squaring
// This is essential for modular arithmetic in cryptographic operations
function modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return result;
}

// Continuously generates random odd BigInts of the given bit size
// until one passes the Miller-Rabin primality test
// Returns a probable prime (not cryptographically guaranteed without more checks)
async function generatePrime(bits = 512) {
    while (true) {
        const candidate = randomBigInt(bits);
        if (isProbablePrime(candidate)) return candidate;
    }
}

// Generates a "safe prime" P such that P = 2q + 1, where both P and q are prime
// Safe primes are used in cryptography to ensure strong subgroup structure
async function generateSafePrime(bits = 512) {
    while (true) {
        const q = await generatePrime(bits - 1);
        const P = 2n * q + 1n;
        if (isProbablePrime(P)) {
        console.log("P (safe prime):", P.toString());
        return P;
    }
  }
}

// Verifies if g is a generator of the prime-order subgroup of size q in Z_P*
// Ensures that g^q ≡ 1 mod P (required) and g^2 != 1 mod P (to avoid trivial subgroup)
function isGenerator(g, P, q) {
    if (modPow(g, q, P) !== 1n) return false;
    if (modPow(g, 2n, P) === 1n) return false;
    return true;
}

// Randomly tries values between 2 and P - 2 until it finds a valid generator g
// for the subgroup of order q in ℤ_P*. Tries up to maxAttempts before failing
function generateGenerator(_P) {
    let foundG = false;
    const q = (_P - 1n) / 2n;
    const maxAttempts = 1000;
    let attempts = 0;

    while (!foundG && attempts < maxAttempts) {
        const g = randomBigIntBetween(2n, _P - 2n);
        if (isGenerator(g, _P, q)) {
        console.log(`${g} is a generator of the subgroup`);
        foundG = true;
        return [g, q];
        } else {
        console.log(`${g} is NOT a generator, try another g`);
        attempts++;
        }
    }

    if (!foundG) {
        throw new Error(`Failed to find generator after ${maxAttempts} attempts.`);
    }
}

// Generates a random private key in the range [1, q - 1]
// This key should remain secret and is used to derive the public key
function generatePrivateKey(_q) {
  return randomBigIntBetween(1n, _q - 1n);
}

// Computes the public key as g^privateKey mod P
// This can be safely shared to compute a shared secret with another party
function generatePublicKey(privateKey, g, P) {
  return modPow(g, privateKey, P);
}

// Converts a BigInt into a Buffer for compatibility with crypto operations like HKDF
// Pads with a zero byte if needed to ensure even-length hex
function bigIntToBuffer(bn) {
  let hex = bn.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return Buffer.from(hex, 'hex');
}

// Derives a fixed-length cryptographic key from a shared secret using HKDF (SHA-256)
// This is used to turn a Diffie-Hellman shared secret into usable symmetric keys
function deriveKey(seed, info = "default", keyLen = 32) {
  return Buffer.from(crypto.hkdfSync(
    "sha256",        
    seed,           
    Buffer.alloc(0),              
    Buffer.from(info),  
    keyLen            
  ));
}

// Generates and prints required variables
async function main() {
    const P = await generateSafePrime(512);
    const [g, q] = generateGenerator(P);
    const privAlice = generatePrivateKey(q);
    const privBob = generatePrivateKey(q);
    const pubAlice = generatePublicKey(privAlice, g, P);
    const pubBob = generatePublicKey(privBob, g, P);
    console.log("P:", P.toString());
    console.log("q:", q.toString());
    console.log("g:", g.toString());
    console.log("privAlice:", privAlice.toString());
    console.log("privBob:", privBob.toString());
    console.log("pubAlice:", pubAlice.toString());
    console.log("pubBob:", pubBob.toString());

    const sharedAlice = modPow(pubBob, privAlice, P);
    const sharedBob = modPow(pubAlice, privBob, P);
    console.log("Shared secret (Alice):", sharedAlice.toString());
    console.log("Shared secret (Bob):", sharedBob.toString());
    console.log("Secrets match?", sharedAlice === sharedBob);

    const sharedSecretBufferAlice = bigIntToBuffer(sharedAlice);
    const sharedSecretBufferBob = bigIntToBuffer(sharedBob);

    const encryptionKeyAlice = deriveKey(sharedSecretBufferAlice, "encryption");
    const hmacKeyAlice = deriveKey(sharedSecretBufferAlice, "authentication");
    const encryptionKeyBob = deriveKey(sharedSecretBufferBob, "encryption");
    const hmacKeyBob = deriveKey(sharedSecretBufferBob, "authentication");

    console.log("Alice's Encryption Key: ", encryptionKeyAlice.toString('hex'));
    console.log("Bob's Encryption Key: ", encryptionKeyBob.toString('hex'));
    console.log("Alice and Bob Encryption Key Match: ", encryptionKeyAlice.equals(encryptionKeyBob));
    console.log("Alice's HMAC Key: ", hmacKeyAlice.toString('hex'));
    console.log("Bob's HMAC Key: ", hmacKeyBob.toString('hex'));
    console.log("Alice and Bob HMAC Key Match: ", hmacKeyAlice.equals(hmacKeyBob));
}

main();
