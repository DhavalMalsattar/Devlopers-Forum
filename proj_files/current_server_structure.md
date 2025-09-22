# 📂 Backend File Structure

```
|-- .env  
|-- .env.example  
|-- .gitignore  
|-- package-lock.json  
|-- package.json  

📂 **docs**  
│   └── design.md  

📂 **sql**  
│   ├── schema.dbml  
│   └── schema.sql  

📂 **src**  
│   ├── app.js  
│   ├── server.js  
│   │  
│   ├── 📂 config  
│   │   └── index.js  
│   │  
│   ├── 📂 controllers  
│   │   ├── authController.js  
│   │   ├── boardsController.js  
│   │   ├── commentsController.js  
│   │   ├── tagsController.js  
│   │   └── threadsController.js  
│   │  
│   ├── 📂 middlewares  
│   │   ├── cacheInvalidate.js  
│   │   ├── cacheMiddleware.js  
│   │   ├── errorHandler.js  
│   │   ├── permissionCheck.js  
│   │   ├── rateLimiter.js  
│   │   ├── sessionAuth.js  
│   │   └── validate.js  
│   │  
│   ├── 📂 routes  
│   │   ├── auth.js  
│   │   ├── boards.js  
│   │   ├── comments.js  
│   │   ├── tags.js  
│   │   └── threads.js  
│   │  
│   ├── 📂 schemas  
│   │   ├── authSchemas.js  
│   │   ├── boardSchema.js  
│   │   ├── commentSchemas.js  
│   │   ├── tagSchemas.js  
│   │   ├── threadSchemas.js  
│   │   ├── userSchemas.js  
│   │   └── voteSchemas.js  
│   │  
│   ├── 📂 services  
│   │   ├── boardService.js  
│   │   ├── commentService.js  
│   │   ├── sessionService.js  
│   │   ├── tagService.js  
│   │   └── threadService.js  
│   │  
│   └── 📂 db  
│       ├── index.js  
│       ├── mongo.js  
│       ├── postgres.js  
│       ├── redis.js  
│       │  
│       └── 📂 models  
│           ├── ActivityLog.js  
│           ├── CommentContent.js  
│           ├── ThreadsContent.js  
│           └── VerificationCode.js  

📂 **node_modules**  
```
