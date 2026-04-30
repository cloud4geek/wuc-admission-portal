/**
 * Converts a numeric amount to Ghana Cedis words.
 * e.g. 4650.50 → "Four Thousand, Six Hundred and Fifty Ghana Cedis, Fifty Pesewas"
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numberToWords(n) {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Negative ' + numberToWords(-n);

  let words = '';

  if (Math.floor(n / 1000000) > 0) {
    words += numberToWords(Math.floor(n / 1000000)) + ' Million';
    n %= 1000000;
    if (n > 0) words += ', ';
  }

  if (Math.floor(n / 1000) > 0) {
    words += numberToWords(Math.floor(n / 1000)) + ' Thousand';
    n %= 1000;
    if (n > 0) words += ', ';
  }

  if (Math.floor(n / 100) > 0) {
    words += ones[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) words += ' and ';
  }

  if (n > 0) {
    if (n < 20) {
      words += ones[n];
    } else {
      words += tens[Math.floor(n / 10)];
      if (n % 10 > 0) words += '-' + ones[n % 10];
    }
  }

  return words;
}

function amountToWords(amount) {
  const num = parseFloat(amount) || 0;
  const cedis = Math.floor(num);
  const pesewas = Math.round((num - cedis) * 100);

  let result = numberToWords(cedis) + ' Ghana Cedis';
  if (pesewas > 0) {
    result += ', ' + numberToWords(pesewas) + ' Pesewas';
  }
  return result;
}

function fmtGHS(n) {
  return `GH\u20B5${parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Safe version for pdf-lib which can't encode the ₵ symbol */
function fmtGHSSafe(n) {
  return `GHC ${parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = { amountToWords, fmtGHS, fmtGHSSafe, numberToWords };
