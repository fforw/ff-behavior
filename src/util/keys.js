if (typeof Object.keys === "function")
{
    module.exports = Object.keys;
}
else
{
    module.exports = function (o)
    {
        if (o !== Object(o))
        {
            throw new TypeError('Object.keys called on a non-object');
        }

        let k = [], p;

        for (p in o)
        {
            if (Object.prototype.hasOwnProperty.call(o, p))
            {
                k.push(p);
            }
        }
        return k;
    }
}