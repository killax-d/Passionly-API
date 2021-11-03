// STRING FORMAT PYTHON STYLE
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match;
        });
    };
}

// ASYNC FOREACH
if (!Array.prototype.asyncForEach) {
    Array.prototype.asyncForEach = async function (callback) {
        for (let index = 0; index < this.length; index++) if ((await callback(this[index], index, this)) === 'break') break;
    }
}