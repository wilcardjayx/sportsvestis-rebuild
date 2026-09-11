# How to Deploy Your New Sportsvestis Website on Namecheap
### For someone who isn't a developer — plain English, no jargon.

---

## What You Have

Your rebuilt website is in this GitHub repo:
**https://github.com/wilcardjayx/sportsvestis-rebuild**

It has two parts:
- **Frontend** — the website your customers see (the store, products, cart, login page)
- **Backend** — the server that handles logins, orders, and security behind the scenes

---

## What You Need to Buy

1. A **Namecheap domain** (you probably already have sportsvestis.com)
2. A **Namecheap Shared Hosting plan** — the "Stellar" plan works ($2-4/month)
   - Go to namecheap.com → Hosting → Shared Hosting → pick Stellar
   - Link it to your domain (sportsvestis.com)

---

## How to Deploy (The Easy Way)

You don't need to do this yourself. **Copy the prompt below and paste it
into Claude (claude.ai) or ChatGPT.** The AI will walk you through every
click, every screen, step by step.

---

## >>> COPY EVERYTHING BELOW THIS LINE AND PASTE IT INTO CLAUDE <<<

---

I need your help deploying a website to Namecheap shared hosting. I am NOT
a developer — I need you to walk me through every single click and screen
like I've never done this before. Use simple language. Tell me exactly
where to click, what to type, and what I should see on screen.

Here is my situation:

1. My website code is on GitHub: https://github.com/wilcardjayx/sportsvestis-rebuild
2. It has a React frontend (frontend/sportsvestis-full.jsx) and a Node.js/Express
   backend (the backend/ folder)
3. I have (or will buy) Namecheap shared hosting with my domain sportsvestis.com
4. I want the store to load when people visit sportsvestis.com
5. I want the backend API running on api.sportsvestis.com (or sportsvestis.com/api)

Please walk me through these steps one at a time. Don't dump everything at
once — give me ONE step, wait for me to confirm I did it, then give me the
next step.

The steps I need help with:

PART A — SET UP HOSTING
- Buying Namecheap shared hosting if I don't have it yet
- Linking my domain to the hosting
- Logging into cPanel for the first time

PART B — BUILD AND UPLOAD THE FRONTEND
- I need help building the React file into a normal website
  (it's a .jsx file that needs to be turned into HTML/CSS/JS)
- Uploading the built files to public_html in cPanel File Manager
- Making sure sportsvestis.com loads the new site

PART C — SET UP THE BACKEND (NODE.JS API)
- Going to Setup Node.js App in cPanel
- Creating the app with these settings:
  - Node version: 20 (or latest)
  - Mode: Production
  - Root: sportsvestis-api
  - Startup file: app.js
  - URL: api.sportsvestis.com (or /api path)
- Uploading the backend code from the GitHub repo's backend/ folder
- Creating an app.js wrapper file for Passenger (Namecheap uses this):

    const app = require('./src/server');
    module.exports = app;

- Running NPM Install in cPanel
- Setting environment variables:
  - NODE_ENV = production
  - JWT_SECRET = (help me generate a random one)
  - CORS_ORIGIN = https://sportsvestis.com
  - PORT = (whatever cPanel assigns)
- Testing that the API works by visiting api.sportsvestis.com/api/health

PART D — CONNECT EVERYTHING
- Making the frontend talk to the backend API
- Setting up SSL (HTTPS) for both the main site and API
- Testing the full flow: browse products, add to cart, create account, login

PART E — GO LIVE
- Pointing my domain's DNS to Namecheap hosting (if not already)
- Removing the old Shopify site / updating DNS
- Final checks before going live

Important notes about my backend:
- It uses SQLite (file-based database) so I do NOT need MySQL or any database setup
- It stores data in a /data folder that gets created automatically
- The server.js file exports an Express app
- It needs a Passenger-compatible wrapper (app.js) at the root

If I get stuck on any step, help me troubleshoot. If you see an error
message, tell me exactly what to do to fix it.

Start with Part A, Step 1.

---

## >>> STOP COPYING HERE <<<

---

## Quick Reference (For You to Bookmark)

| What               | Where                                              |
|---------------------|---------------------------------------------------|
| Your code           | github.com/wilcardjayx/sportsvestis-rebuild        |
| Namecheap login     | namecheap.com → Sign In                           |
| cPanel login        | namecheap.com → Dashboard → Hosting → Go to cPanel|
| File Manager        | cPanel → Files → File Manager                     |
| Node.js setup       | cPanel → Software → Setup Node.js App             |
| SSL setup           | cPanel → Security → SSL/TLS or AutoSSL            |
| DNS settings        | Namecheap Dashboard → Domain List → Manage → DNS  |

## If Something Breaks

Paste this into Claude or ChatGPT:

"I'm deploying sportsvestis-rebuild from GitHub to Namecheap shared hosting.
Here's the error I'm seeing: [paste the error]. My setup: Node.js on cPanel
with Passenger, SQLite backend, React frontend in public_html. Help me fix it."

---

## Cost Summary

| Item                        | Cost          |
|-----------------------------|---------------|
| Namecheap Stellar Hosting   | ~$2-4/month   |
| Domain (if you already have it) | $0        |
| SSL Certificate             | Free (included)|
| Database                    | Free (SQLite)  |
| **Total**                   | **~$2-4/month**|

No extra servers, no database subscriptions, no complicated cloud setup.
Everything runs on one cheap shared hosting plan.
