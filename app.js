const fs = require('fs');
const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .alias('?', 'help')
  .alias('i', 'input')
  .describe('i', 'JSON input file containing string fragment array, defaults to hardcoded test data')
  .alias('o', 'output')
  .describe('o', 'Output file path for saving results, defaults to console out')
  .string(['i'])
  .argv;

const testData = [
  'a l l   i s   w e l l',
  'e l l   t h a t   e n',
  'h a t   e n d',
  't   e n d s   w e l l',
];

function calcOverlap(s1, s2) {
  const ts1 = s1 || '';
  const ts2 = s2 || '';
  const calc = {};

  if (ts1.includes(ts2)) {
    calc.overlap = ts2;
    calc.merge = ts1;
    return calc;
  }

  for (let i = 0; i < ts2.length; i++) {
    const token = ts2.substr(0, (i + 1));
    if (!ts1.includes(token)) {
      break;
    }

    calc.overlap = token;
  }

  if (calc.overlap && ts1.endsWith(calc.overlap)) {
    const ss1 = ts1.substr(0, (ts1.length - calc.overlap.length));
    const ss2 = ts2.substr(calc.overlap.length);
    calc.merge = `${ss1}${calc.overlap}${ss2}`
  } else {
    calc.overlap = '';
    calc.merge = `${ts1}${ts2}`
    return calc;
  }

  return calc;
}

function mergeInput(strings) {
  return new Promise((resolve, reject) => {
    let lstrings = strings || [];
    let loopIx = lstrings.length;
    while (loopIx > 1) {
      let mergeCandidate = null;
      // run through the string array forward
      for (let iFwd = 0; iFwd < lstrings.length - 1; iFwd++) {
        const calc = calcOverlap(lstrings[iFwd], lstrings[iFwd + 1]);
        if (calc && (!mergeCandidate || (mergeCandidate.overlap.length < calc.overlap.length))) {
          mergeCandidate = Object.assign(calc, { ix: iFwd});
        }
      }

      // run through the string array backward
      for (let iBkwd = lstrings.length - 1; iBkwd > 0; iBkwd--) {
        const calc = calcOverlap(lstrings[iBkwd], lstrings[iBkwd - 1]);
        if (calc && (!mergeCandidate || (mergeCandidate.overlap.length < calc.overlap.length))) {
          mergeCandidate = Object.assign(calc, { ix: iBkwd - 1});
        }
      }

      if (mergeCandidate) {
        lstrings.splice(mergeCandidate.ix, 2);
        lstrings = [mergeCandidate.merge].concat(lstrings);
      }
      loopIx = lstrings.length;
    }

    if (lstrings.length !== 1) {
      reject({ msg: 'merge failure', result: lstrings });
    }

    resolve(lstrings[0]);
  });
}

function readInput() {
  if (!argv.input) {
    return Promise.resolve(testData);
  }

  return new Promise((resolve, reject) => {
    fs.readFile(argv.input, 'utf-8', (err, fileContents) => {
      if (err) {
        reject(err);
      } else {
        try {
          const data = JSON.parse(fileContents);
          resolve(data);
        } catch(exc) {
          reject(exc);
        }
      }
    });
  });
}

function writeOutput(result) {
  if (!argv.output) {
    console.log(`result:\n${result}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(argv.output, result, 'utf-8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

readInput()
  .then((data) => {
    return mergeInput(data);
  })
  .then((result) => {
    return writeOutput(result);
  })
  .catch((error) => {
    console.error({ error }, '\nexecution failed');
  });


