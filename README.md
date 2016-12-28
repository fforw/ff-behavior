# ff-behavior

Small, no-dependency javascript behavior tree engine to run game/simulation AI.

## Usage

The library exports an API facade object over which all functionality is accessible.

```js

var Behavior = require("ff-behavior");

// load behavior
var b = Behavior.load(require("./my-behavior.json"));

// create instance with optional tree memory
var instance = b.createInstance({ 
    count: 0 
});

// register a leaf action handler
Behavior.registerAction("my-action", function(ctx, tree, node)
{
    // your action code...        
});


// evaluate the tree once for the given instance and context 
b.update(myContext, instance);

```

## Actions

Everything works with custom action implementations. Each action has a unique name (that is not
one of the builtin, reserved names, see below).

An action definition is either just an update function
```js
Behavior.registerAction("my-action", function(ctx, tree)
{
    // your action code...        
});

Behavior.registerAction("another-action", function(ctx, tree, node)
{
    // action code with local node memory        
});

```

or an object with an "init" and an "update" function.
 
```js
{
    init: function(ctx, tree, node)
    {
            
    },
    update: function(ctx, tree, node)
    {
            
    }
}

```

The number of parameters on the update function control the creation of a local node memory for that node which 
is a object map that is created for every instance of the action leaf, and not for tree-global memory "tree".

The "ctx" argument is a passed through from Behavior.update to allow passing in an object to 
connect your actions to your game without defining the actions as closures.


## JSON Data Format

The basis for the behavior trees is a simple JSON format. 

```json
{ 
    "root" :{
        "name" : "Sequence",
        "kids" : [
        
        ]
    }
}
```

The root property contains the actual recursive tree definition. Every node has a "name" 
attribute that identifies the type of node. Some nodes have a "kids" array property that
contains the children of that node etc.

### Builtins

 * Sequence
 
   Evaluates children until one of them fails. Succeeds itself if all children succeed. 
   Equivalent to a logical AND.
   
 * Selector
 
   Evaluates children until one of them succeeds. Suceeds if one of the children suceeds.
   Equivalent to a logical OR
   
### Decorators

 * Inverter
 
   Inverts the result of a single child.
   
 * Succeeder
 
   Evaluates a single child and always succeeds.
   
 * Failer
 
   Evaluates a single child and always fails.
   
 * RepeatUntilSuccess
 
   Synchronously repeat a single child until it suceeds. 
 
 * RepeatUntilFailur
 
   Synchronously repeat a single child until it fails. 

