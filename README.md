# Diffie-Hellman Key Exchange Simulation

This project is a simplified local demonstration of the Diffie-Hellman key exchange protocol using 512-bit safe primes.

**Important:** 512-bit primes are no longer considered secure by modern cryptographic standards, so keys derived from this program should **never** be used in production or real secure communication.

---

## Features

- Generates safe primes (`P`) and corresponding subgroup order (`q`)
- Finds a suitable generator (`g`)
- Simulates private/public key generation for Alice and Bob
- Computes the shared secret and confirms it matches on both sides
- Derives Encryption and HMAC keys from the shared secret using HKDF
- Uses only Node.js built-in `crypto` module (no external dependencies)

---

## Usage

Clone the repository and navigate to the project folder, then run:

```bash
npm start
```
or 
```bash
node index.js
```
Note: Finding a suitable prime P can be computationally intensive and may take a minute or more depending on your system.

---

## Output
The program will print to the console:
- Safe prime `P` and subgroup order `q`
- Generator `g`
- Private and public keys for Alice and Bob
- Derived shared secrets (should match)
- Encryption and HMAC keys (should also match)

 ---

## Project Structure
Currently, the entire implentation resides in a single `index.js` file containing all helper functions. Future updates may refeactor the codebase or provide implentations in other languages such as Python.

---

## Security Disclaiminer
This project is for education and demonstration purposes only. The cryptographic parameters and implementations are simplified and not suitable for any real-world secure communications.

---

**Feel free to open issues or submit pull requests if you want to improve or extend the project!**