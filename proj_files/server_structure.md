```plaintext
server/
├── README.md
├── package.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── migrations/
│   └── 001_create_schema.sql         # (optional: keep versioned SQL here)
├── prisma/ or ormconfig/             # optional: prisma/schema.prisma or sequelize config
├── src/
│   ├── app.js                        # express app wiring
│   ├── server.js                     # http server / start + graceful shutdown
│   ├── config/
│   │   └── index.js                  # load env, DB URLs, redis config
│   ├── db/
│   │   ├── index.js                  # pg Pool / client wrapper
│   │   └── migrations/               # optional programmatic migrations
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── threads.js
│   │   ├── comments.js
│   │   ├── votes.js
│   │   ├── tags.js
│   │   ├── search.js
│   │   ├── notifications.js
│   │   └── admin.js
│   ├── controllers/                  # thin controllers that call services
│   │   ├── authController.js
│   │   ├── usersController.js
│   │   ├── threadsController.js
│   │   ├── commentsController.js
│   │   ├── votesController.js
│   │   ├── tagsController.js
│   │   ├── notificationsController.js
│   │   └── adminController.js
│   ├── services/                     # business logic + DB queries
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── threadService.js
│   │   ├── commentService.js
│   │   ├── voteService.js
│   │   ├── tagService.js
│   │   └── notificationService.js
│   ├── middlewares/
│   │   ├── authRequired.js
│   │   ├── optionalAuth.js
│   │   ├── permissionCheck.js
│   │   ├── validate.js
│   │   ├── rateLimiter.js
│   │   ├── cacheMiddleware.js
│   │   ├── cacheInvalidate.js
│   │   ├── idGenerator.js            # fallback generator (calls nextval when needed)
│   │   ├── sanitizeInput.js
│   │   ├── uploadHandler.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── buildCommentTree.js       # flat -> nested tree helper
│   │   └── paginator.js
│   ├── jobs/                         # optional background jobs (notifications, refresh mv)
│   │   └── refreshPopularThreads.js
│   └── tests/
│       └── integration/              # API integration tests
├── sql/
│   └── schema.sql                    # final DDL you will run (provided below)
└── logs/
