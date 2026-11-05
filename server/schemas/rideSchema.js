const Joi = require("joi");

const rideSchema = Joi.object({
  from: Joi.string().trim().required(),
  to: Joi.string().trim().required(),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),

  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required(),

  maxSeats: Joi.number().integer().min(1).required()
});
// update schema valid
const updateRideSchema = Joi.object({
  from: Joi.string().trim().min(1),
  to: Joi.string().trim().min(1),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/),

  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/),

  maxSeats: Joi.number().integer().min(1)
}).min(1);
module.exports ={rideSchema,updateRideSchema};