const actions = {};

const  MODULE_NAME_REGEXP = /^.\/(.*)\.js/;

const ActionService = {
    registerFromRequireContext: function (ctx)
    {
        const modules = ctx.keys();

        for (let i = 0; i < modules.length; i++)
        {
            const moduleName = modules[i];
            let handler = ctx(moduleName);

            if (typeof handler !== "function")
            {
                throw new Error("Action module '" + moduleName + "' does not export a function");
            }

            const actionName = moduleName.replace(MODULE_NAME_REGEXP, "$1");
            ActionService.register(actionName, handler);
        }
    },

    register: function (actionName, handler)
    {
        //console.log("Register" , actionName , "to", handler);
        actions[actionName] = handler;
    },

    lookup: function(actionName)
    {
        let handler = actions[actionName];

        //console.log("Lookup", actionName , "=>", handler);

        return handler;
    }

};

module.exports = ActionService;
