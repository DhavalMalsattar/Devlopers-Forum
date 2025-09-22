// src/middlewares/validate.js
const { ZodError } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      // Merge all sources of input (you can customize this)
      const data = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      // Parse & validate
      schema.parse(data);

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors,
        });
      }
      return next(err);
    }
  };
}

module.exports = validate;
