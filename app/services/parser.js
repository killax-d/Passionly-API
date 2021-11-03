const PGValuesFromArray = (array) => {
  return {query: array.reduce((acc, value, i) => acc + "$" + (i+1) + "::text, ", "").slice(0, -2), values: array}
}

module.exports = {
  PGValuesFromArray
}