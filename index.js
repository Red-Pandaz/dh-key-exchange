const crypto = require("crypto");

function randomBigIntBetween(min, max) {
  if (min > max) throw new Error("min > max");

  const range = max - min + 1n;
  const bitLength = range.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);

  let random;
  do {
    const bytes = crypto.randomBytes(byteLength);
    random = BigInt("0x" + bytes.toString("hex"));
  } while (random >= range);
  return random + min;
}

function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  const buffer = crypto.randomBytes(bytes);
  let bigint = BigInt("0x" + buffer.toString("hex"));

  const extraBits = bytes * 8 - bits;
  bigint = bigint >> BigInt(extraBits);

  bigint = bigint | 1n;

  bigint = bigint | (1n << BigInt(bits - 1));

  return bigint;
}

function isProbablePrime(n, k = 5) {
  if (n === 2n || n === 3n) return true;
  if (n < 2n || n % 2n === 0n) return false;

  let s = 0n;
  let d = n - 1n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  WitnessLoop: for (let i = 0n; i < k; i++) {
    const a = randomBigIntBetween(2n, n - 2n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;

    for (let r = 1n; r < s; r++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) continue WitnessLoop;
    }
    return false;
  }

  return true;
}

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

async function generatePrime(bits = 512) {
  while (true) {
    const candidate = randomBigInt(bits);
    if (isProbablePrime(candidate)) return candidate;
  }
}

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

function isGenerator(g, P, q) {
  if (modPow(g, q, P) !== 1n) return false;
  if (modPow(g, 2n, P) === 1n) return false;
  return true;
}

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

function generatePrivateKey(_q) {
  return randomBigIntBetween(1n, _q - 1n);
}

function generatePublicKey(privateKey, g, P) {
  return modPow(g, privateKey, P);
}

function bigIntToBuffer(bn) {
  let hex = bn.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return Buffer.from(hex, 'hex');
}

function deriveKey(seed, info = "default", keyLen = 32) {
  return Buffer.from(crypto.hkdfSync(
    "sha256",        
    seed,           
    Buffer.alloc(0),              
    Buffer.from(info),  
    keyLen            
  ));
}

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
