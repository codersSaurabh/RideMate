const Joi = require("joi");

const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),

  email: Joi.string().email().required(),

  password: Joi.string().min(8).required(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
      "any.required": "Phone number is required"
    })
});
//login form validation
const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required()
});
//ride form validation


module.exports = { signupSchema, loginSchema };

