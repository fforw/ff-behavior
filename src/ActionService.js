const  MODULE_NAME_REGEXP = /^.\/(.*)\.js$/;

const RESERVED_ACTION_NAMES = {
    'Selector' : true,
    'Sequence' : true
};

let actions = {};

const ActionService = {
    registerFromRequireContext: function (ctx)
    {
        const modules = ctx.keys();

        for (let i = 0; i < modules.length; i++)
        {
            const moduleName = modules[i];
            let handler = ctx(moduleName);

            const m = MODULE_NAME_REGEXP.exec(moduleName);
            if (m)
            {
                const actionName = m[1];
                if (RESERVED_ACTION_NAMES.hasOwnProperty(actionName))
                {
                    throw new Error("'" + actionName + "' is a reserved name. You need to rename " + moduleName);
                }
                ActionService.register(actionName, handler);
            }
        }
    },

    register: function (actionName, handler)
    {
        if (typeof handler === "function")
        {
            handler = {
                update: handler
            };
        }

        if (typeof handler !== "object" || typeof handler.update !== "function")
        {
            throw new Error("Invalid leaf handler", handler);
        }

        //console.log("Register" , actionName , "to", handler);
        actions[actionName] = handler;
    },

    lookup: function(actionName)
    {
        let handler = actions[actionName];

        //console.log("Lookup", actionName , "=>", handler);

        return handler;
    },

    reset: function()
    {
        actions = {};
    }

};

module.exports = ActionService;
