var _ = require('../utils').getLodash();
var ExpressionNode = require('./expressionNode');
var Equation = require('./equation');

/**
 * An EquationSet consists of a top level (compute) equation, and optionally
 * some number of support equations
 * @param {!Array} blocks List of blockly blocks
 */
var EquationSet = function (blocks) {
  this.compute_ = null; // an Equation
  this.equations_ = []; // a list of Equations

  if (blocks) {
    blocks.forEach(function (block) {
      var equation = getEquationFromBlock(block);
      if (equation) {
        this.addEquation_(equation);
      }
    }, this);
  }
};
module.exports = EquationSet;

EquationSet.prototype.clone = function () {
  var clone = new EquationSet();
  clone.compute_ = null;
  if (this.compute_) {
    clone.compute_ = this.compute_.clone();
  }
  clone.equations_ = this.equations_.map(function (item) {
    return item.clone();
  });
  return clone;
};

/**
 * Adds an equation to our set. If equation's name is null, sets it as the
 * compute equation. Throws if equation of this name already exists.
 * @param {Equation} equation The equation to add.
 */
EquationSet.prototype.addEquation_ = function (equation) {
  if (!equation.name) {
    if (this.compute_) {
      throw new Error('compute expression already exists');
    }
    this.compute_ = equation;
  } else {
    if (this.getEquation(equation.name)) {
      throw new Error('equation already exists: ' + equation.name);
    }
    this.equations_.push(equation);
  }
};

/**
 * Get an equation by name, or compute equation if name is null
 * @returns {Equation} Equation of that name if it exists, null otherwise.
 */
EquationSet.prototype.getEquation = function (name) {
  if (name === null) {
    return this.computeEquation();
  }
  for (var i = 0; i < this.equations_.length; i++) {
    if (this.equations_[i].name === name) {
      return this.equations_[i];
    }
  }
  return null;
};

/**
 * @returns the compute equation if there is one
 */
EquationSet.prototype.computeEquation = function () {
  return this.compute_;
};

/**
 * @returns true if EquationSet has at least one variable or function.
 */
EquationSet.prototype.hasVariablesOrFunctions = function () {
  return this.equations_.length > 0;
};

/**
 * @returns {boolean} True if the EquationSet has exactly one function and no
 * variables. If we have multiple functions or one function and some variables,
 * returns false.
 */
EquationSet.prototype.hasSingleFunction = function () {
   if (this.equations_.length === 1 && this.equations_[0].isFunction()) {
     return true;
   }

   return false;
};

/**
 * @returns {boolean} True if our compute expression is just a variable, which
 * we take to mean we can treat similarly to our single function scenario
 */
EquationSet.prototype.computesSingleVariable = function () {
  if (!this.compute_) {
    return false;
  }
  var computeExpression = this.compute_.expression;
  return computeExpression.isVariable();
};

/**
 * Example set that returns true:
 * Age = 12
 * compute: Age
 * @returns {boolean} True if our EquationSet consists of a variable set to
 *   a number, and the computation of that variable.
 */
EquationSet.prototype.computesSingleConstant = function () {
  if (!this.compute_ || this.equations_.length !== 1) {
    return false;
  }
  var equation = this.equations_[0];
  var computeExpression = this.compute_.expression;
  return computeExpression.isVariable() && equation.expression.isNumber() &&
    computeExpression.getValue() === equation.name;

};

/**
 * Returns a list of equations that consist of setting a variable to a constant
 * value, without doing any additional math. i.e. foo = 1
 */
EquationSet.prototype.getConstants = function () {
  return this.equations_.filter(function (item) {
    return item.params.length === 0 && item.expression.isNumber();
  });
};

/**
 * Are two EquationSets identical? This is considered to be true if their
 * compute expressions are identical and all of their equations have the same
 * names and identical expressions.
 */
EquationSet.prototype.isIdenticalTo = function (otherSet) {
  if (this.equations_.length !== otherSet.equations_.length) {
    return false;
  }

  var otherCompute = otherSet.computeEquation().expression;
  if (!this.compute_.expression.isIdenticalTo(otherCompute)) {
    return false;
  }

  for (var i = 0; i < this.equations_.length; i++) {
    var thisEquation = this.equations_[i];
    var otherEquation = otherSet.getEquation(thisEquation.name);
    if (!otherEquation ||
        !thisEquation.expression.isIdenticalTo(otherEquation.expression)) {
      return false;
    }
  }

  return true;
};

/**
 * Returns a list of the non-compute equations (vars/functions) sorted by name.
 */
EquationSet.prototype.sortedEquations = function () {
  // note: this has side effects, as it reorders equations. we could also
  // ensure this was done only once if we had performance concerns
  this.equations_.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  return this.equations_;
};

// TODO - unit test
EquationSet.prototype.hasDivZero = function () {
  var evaluation = this.evaluate();
  return evaluation.err &&
    evaluation.err instanceof ExpressionNode.DivideByZeroError;
};

/**
 * Evaluate the EquationSet's compute expression in the context of its equations
 */
EquationSet.prototype.evaluate = function () {
  return this.evaluateWithExpression(this.compute_.expression);
};

/**
 * Evaluate the given compute expression in the context of the EquationSet's
 * equations. For example, our equation set might define f(x) = x + 1, and this
 * allows us to evaluate the expression f(1) or f(2)...
 * @param {ExpressionNode} computeExpression The expression to evaluate
 * @returns {Object} evaluation An object with either an err or result field
 * @returns {Error?} evalatuion.err
 * @returns {Number?} evaluation.result
 */
EquationSet.prototype.evaluateWithExpression = function (computeExpression) {
  // no variables/functions. this is easy
  if (this.equations_.length === 0) {
    return computeExpression.evaluate();
  }

  // Iterate through our equations to generate our mapping. We may need to do
  // this a few times. Stop trying as soon as we do a full iteration without
  // adding anything new to our mapping.
  var mapping = {};
  var madeProgress;
  var testMapping;
  var evaluation;
  var setTestMappingToOne = function (item) {
    testMapping[item] = 1;
  };
  do {
    madeProgress = false;
    for (var i = 0; i < this.equations_.length; i++) {
      var equation = this.equations_[i];
      if (equation.isFunction()) {
        if (mapping[equation.name]) {
          continue;
        }
        // see if we can map if we replace our params
        // note that params override existing vars in our testMapping
        testMapping = _.clone(mapping);
        equation.params.forEach(setTestMappingToOne);
        evaluation = equation.expression.evaluate(testMapping);
        // TODO - single place for string check
        if (evaluation.err &&
            evaluation.err instanceof ExpressionNode.DivideByZeroError) {
          continue;
        }

        // we have a valid mapping
        madeProgress = true;
        mapping[equation.name] = {
          variables: equation.params,
          expression: equation.expression
        };
      } else if (mapping[equation.name] === undefined) {
        evaluation = equation.expression.evaluate(mapping);
        if (evaluation.err) {
          if (evaluation.err instanceof ExpressionNode.DivideByZeroError) {
            return { err: evaluation.err };
          }
        } else {
          // we have a variable that hasn't yet been mapped and can be
          madeProgress = true;
          mapping[equation.name] = evaluation.result;
        }
      }
    }

  } while (madeProgress);

  return computeExpression.evaluate(mapping);
};

/**
 * Given a Blockly block, generates an Equation.
 */
function getEquationFromBlock(block) {
  var name;
  if (!block) {
    return null;
  }
  var firstChild = block.getChildren()[0];
  switch (block.type) {
    case 'functional_compute':
      if (!firstChild) {
        return new Equation(null, [], null);
      }
      return getEquationFromBlock(firstChild);

    case 'functional_plus':
    case 'functional_minus':
    case 'functional_times':
    case 'functional_dividedby':
      var operation = block.getTitles()[0].getValue();
      var args = ['ARG1', 'ARG2'].map(function(inputName) {
        var argBlock = block.getInputTargetBlock(inputName);
        if (!argBlock) {
          return 0;
        }
        return getEquationFromBlock(argBlock).expression;
      });

      return new Equation(null, [], new ExpressionNode(operation, args, block.id));

    case 'functional_math_number':
    case 'functional_math_number_dropdown':
      var val = block.getTitleValue('NUM') || 0;
      if (val === '???') {
        val = 0;
      }
      return new Equation(null, [],
        new ExpressionNode(parseFloat(val), [], block.id));

    case 'functional_call':
      name = block.getCallName();
      var def = Blockly.Procedures.getDefinition(name, Blockly.mainBlockSpace);
      if (def.isVariable()) {
        return new Equation(null, [], new ExpressionNode(name));
      } else {
        var values = [];
        var input, childBlock;
        for (var i = 0; !!(input = block.getInput('ARG' + i)); i++) {
          childBlock = input.connection.targetBlock();
          values.push(childBlock ? getEquationFromBlock(childBlock).expression :
            new ExpressionNode(0));
        }
        return new Equation(null, [], new ExpressionNode(name, values));
      }
      break;

    case 'functional_definition':
      name = block.getTitleValue('NAME');

      var expression = firstChild ? getEquationFromBlock(firstChild).expression :
        new ExpressionNode(0);

      return new Equation(name, block.getVars(), expression);

    case 'functional_parameters_get':
      return new Equation(null, [], new ExpressionNode(block.getTitleValue('VAR')));

    case 'functional_example':
      return null;

    default:
      throw "Unknown block type: " + block.type;
  }
}

/* start-test-block */
// export private function(s) to expose to unit testing
EquationSet.__testonly__ = {
  getEquationFromBlock: getEquationFromBlock
};
/* end-test-block */
