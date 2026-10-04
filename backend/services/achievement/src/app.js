const {
  createBaseApp, finish, asyncHandler, createAccessVerifier, createRequireAuth,
} = require('@dopamind/common');

function createApp({ pool, logger, publicKey, service }) {
  const app = createBaseApp({ service: 'achievement', logger, pool });
  const requireAuth = createRequireAuth(createAccessVerifier({ publicKey }));

  app.get('/achievements', requireAuth, asyncHandler(async (req, res) => {
    res.json({ achievements: await service.listAchievements(req.userId) });
  }));

  app.get('/progress', requireAuth, asyncHandler(async (req, res) => {
    res.json({ progress: await service.getProgress(req.userId) });
  }));

  return finish(app, logger);
}

module.exports = { createApp };
