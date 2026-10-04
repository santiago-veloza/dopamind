// Valida con un esquema zod; deja el resultado limpio en req.valid[source]
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.valid = req.valid || {};
    req.valid[source] = result.data;
    next();
  };
}

module.exports = { validate };
