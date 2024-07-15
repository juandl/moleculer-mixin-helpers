const BaseValidator = require('moleculer').Validators.Fastest;
const { ValidationError } = require('moleculer').Errors;

const _ = require('lodash');

class JoiValidator extends BaseValidator {
  constructor() {
    super();

    this.Joi = require('joi');
  }

  compile(schema) {
    //Check if schema is joi format
    if (this.Joi.isSchema(schema)) {
      return (params) => this.validate(params, schema);
    } else if (this.validator) {
      //Use fastest-validator
      return this.validator.compile(_.cloneDeep(schema));
    }
  }

  /**
   * Clean messages
   * From "\"name\" is required"
   * to "name is required"
   * @param {string} msg
   * @returns {string}
   */
  cleanMessage(msg) {
    if (!msg) return '';

    return _.replace(msg, /([^\w\d\s])+/g, '');
  }

  /**
   * Validate joi schema
   * @param {Object} params
   * @param {*} schema
   * @returns
   */
  validate(params, schema) {
    let errors = [];

    /**
     * If not Joi schema, use fastest
     */
    if (!this.Joi.isSchema(schema)) {
      const fastest = this.validator.validate(params, _.cloneDeep(schema));

      if (fastest !== true) throw new ValidationError("Parameters validation error!", null, fastest);

      return true;
    }

   params = this.getParams(params);

    //Validate schema
    const { error } = schema.validate(params, {
      abortEarly: true,
    });

    //Check errors and normalize then
    if (!_.isEmpty(error)) {
      /**
       * Create Custom Error
       */
      if (error.details) {
        _.forEach(error.details, (value) => {
          let errorObj = {
            type: null,
            field: null,
            uid: null,
            message: null,
          };

          //Assign type
          if (value.type) {
            errorObj.type = value.type;
          }

          //Assign field name
          if (value.context) {
            errorObj.field = value.context.key;
          }

          //Assign message error
          if (value.message) {
            errorObj.message = this.cleanMessage(value.message);
          }

          //Create uid
          if (errorObj.type && errorObj.field) {
            errorObj.uid = `${errorObj.field}.${errorObj.type}`;
          }

          errors.push(errorObj);
        });
      }

      /**
       * Return errors
       */
      if (error) {
        throw new ValidationError(
          this.cleanMessage(error.message),
          null,
          errors
        );
      }
    }

    return true;
  }

  /**
   *
   * @param {Object} params - Parameters received before action
   * @param {Object} params.body - (mergeParams disabled) body for POST requests
   * @param {Object} params.query - (mergeParams disabled) query parameters
   * @param {Object} params.params - (mergeParams disabled) URL parameters
   * @returns {Object}
   */
  getParams(params){
    // Check if is merged schema
   let data = {};

   if(!(_.has(params, "body") || _.has(params, "query") || _.has(params, "params")))
     return params;

    const keysOrder = ["body", "query", "params"];

   _.forEach(keysOrder, (value) => {
      data = _.get(params, value, {});

      if(!_.isEmpty(data)){
        return false;
      }
      return true;
    });

   return data;
 }
}

module.exports = JoiValidator;
