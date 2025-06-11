const crypto = require("crypto");

function randomBigIntBetween(min, max) {
  if (min > max) throw new Error("min > max");

  const range = max - min + 1n;
  const bitLength = range.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);

  let random;
  do {
    const bytes = crypto.randomBytes(byteLength);
    random = BigInt('0x' + bytes.toString('hex'));
  } while (random >= range);
  return random + min;
}

function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  const buffer = crypto.randomBytes(bytes);
  let bigint = BigInt('0x' + buffer.toString('hex'));

  const extraBits = (bytes * 8) - bits;
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

async function generateSafePrime(bits = 512){
    while(true) {
        const q = await generatePrime(bits - 1);
        const P = 2n * q + 1n;
        if (isProbablePrime(P)){
            return P;
        }
    }
}

function isGenerator(g, P, q) {
  return modPow(g, q, P) === 1n;
}

async function main() {
    const P = await generateSafePrime(512);
    console.log("P (safe prime):", P.toString());
    let foundG = false;
    const q = (P - 1n) / 2n;
    const maxAttempts = 1000;
    let attempts = 0;

    while (!foundG && attempts < maxAttempts) {
        const g = randomBigIntBetween(2n, P - 2n);
        if (isGenerator(g, P, q)) {
            console.log(`${g} is a generator of the subgroup`);
            foundG = true;
        } else {
            console.log(`${g} is NOT a generator, try another g`);
            attempts++;
        }
    }

if (!foundG) {
  console.log(`Failed to find generator after ${maxAttempts} attempts.`);
}
}

main();