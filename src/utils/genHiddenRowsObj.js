module.exports = function genHiddenRowsObj(hiddenRows) {
  var obj = {};
  hiddenRows.forEach(function(item){
    obj[item] = true;
  });
  return obj;
};