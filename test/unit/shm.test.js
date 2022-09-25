
assert("Simple integral sum (success)", ((a, b) => a + b)(1, 2), 3);

assert("Positive promise resolve", (_ => new Promise(r => r(5)))(), 5);