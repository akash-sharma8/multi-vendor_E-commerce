# Individual reflection: guide

The brief asks for a reflection on **what you learned and what you owned**. This one has to be in your own words, because the evaluators are reading for your honest experience. Below are prompts and a skeleton. Fill it with your real answers, 1 to 2 pages.

## Be honest about how you worked

You built this project with a lot of AI guidance. The safest and strongest approach is to say so plainly and show what you understood. Check your internship's rules on AI assistance and follow them. An honest line like this works well:

> "I used an AI assistant to guide the architecture and to explain code step by step. I typed and ran everything myself, debugged the errors on my machine, and I can explain each part."

Only write that if it is true. Then make it true: before the presentation, open each module and be able to explain it without looking at notes (see the checklist at the end).

## Skeleton

### 1. What I built
Two or three sentences: the project, the three roles, the main features.

### 2. What I owned
List the parts you personally handled and can explain. Examples:
- Setting up Docker, the database and Prisma
- Auth and roles
- Checkout and stock handling
- Razorpay integration and testing
- The frontend pages
- Writing and running the tests and the load test

### 3. What I learned
Write 4 to 6 specific things. Specific beats general. Examples of the kind of thing to write (use only what is true for you):
- Why money should be stored as integers.
- How a database transaction protects stock when two people buy at once.
- Why a payment must be verified on the server and not trusted from the browser.
- How a search index differs from the main database and why it can be rebuilt.
- How to read an error message and find the real cause (for example, import paths, Express 5 route rules, Prisma config).

### 4. A problem I got stuck on
Pick one real problem. Describe: what went wrong, what you tried, what the cause was, how it was fixed, what you would check first next time.

Possible real examples from this project: migration failing because the config skipped `.env`, the image storage container not downloading, files pasted in the wrong place causing import errors, a search delete bug found by a test.

### 5. What I would do differently
For example: write tests earlier, plan the folder layout first, deploy earlier to find production problems sooner.

### 6. What I would build next
Pick two items from the next steps list in the README.

## Checklist before you submit (so the reflection is true)

For each item, be able to explain it out loud in under a minute:

- [ ] How a request travels: route, middleware, controller, service
- [ ] How the JWT is created and checked
- [ ] How checkout prevents overselling
- [ ] How commission and vendor earnings are calculated
- [ ] How the payment signature is verified and why paying twice is safe
- [ ] How the search index is kept in sync
- [ ] Why the cart is in Redis
- [ ] How the frontend knows your role and protects pages
- [ ] One test, line by line

If you cannot explain one, read that file again, change a small thing, and watch what breaks. That is the fastest way to really learn it.