# Rwanda Electricity Tax Manager

It is a web application that helps electricity companies in Rwanda calculate and track the 18% VAT(Value Added Tax) on electricity sales RRA compliant (Rwanda Revenue Authority). The VAT can also be displayed in a foreign currency using live exchange rates, and late payment penalty can be estimated.

Table of contents

1. Links
2. Features
3. Tech Stack
4. Architecture
5. Late Payment Penalty
6. External API
7. Run locally
8. Deployment
9. Testing the Load Balancer
10. Testing the Application
11. Challenges and solutions 

# Links

- Live site(load balancer): http://18.170.61.114
- Demo video: https://youtu.be/MHpvesagW7w
- GitHub repository: https://github.com/cbangadits-gif/web-infrastructure-summative
No login and no API key are required.


## Features

- Calculate 18% VAT (Standard) or 0% (Exempt)
- Convert the VAT to USD, EUR and other currencies using live exchange rates
- Late payment penalty estimate: enter the number of months late to see the penalty and the total due
- History table (including a late penalty column) with search filter
- Clear error messages for invalid input and for API downtime

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Web server/load balancer: Nginx
- Process manager: pm2
- External API: ExchangeRate-API

## Architecture

The application runs on two web servers behind a load balancer. Nginx is used on all three machines.

                  Internet
                      |
                      v
      +------------------------------------+
      |          Lb01 (Nginx)              | 
      |          18.170.61.114             |
      |          round-robin               |
      +---------------+--------------------+
                      |
        +-------------+--------------+
        v                            v
+-------------------+      +--------------------+
|   Web 01          |      |    Web 02          |
|   13.40.124.176   |      |    13.135.67.110   |
|   Nginx -> Node   |      |    Nginx -> Node   |
|   (pm2, :3000)    |      |    (pm2, :3000)    |
+---------+---------+      +----------+---------+
          |                           |
          +-------------+-------------+
                        v
                ExchangeRate-API

## Late Payment Penalty (simplified model)

If the user enters a number of months late, the application adds a penalty of 3% of the VAT due per month (1.5% penalty + 1.5% interest):
* penalty = VAT due x 3% x months late
* total due = VAT due + penalty
Example: 100,000 RWF, Standard category, 2 months late
VAT = 18,000 RWF, penalty=1,080 RWF, total due=19,080 RWF

 This is a simplified estimate for demonstration purposes, not an official RRA calculation. The real RRA interest and penalty rules are more detailed and depend on the length of the delay.

## External API

ExchangeRate-API: (free, no key):live exchange rates.
Documentation: https://www.exchangerate-api.com/docs/free 
The frontend never calls this API directly. It calls the backend proxy endpoint /api/convert, which fetches the rates and returns them (this avoids CORS problems).


## Run Locally

- Requirements: Node.js 18 or newer.
* git clone https://github.com/cbangadits-gif/web-infrastructure-summative.git
* cd web-infrastructure-summative/server
* npm install
* node index.js
The open http://localhost:3000

- Deployment
  On web01 and web02
* sudo apt update && sudo apt install -y git nginx curl
* curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
* sudo apt install -y nodejs
* git clone https://github.com/cbangadits-gif/web-infrastructure-summative.git
* cd web-infrastructure-summative/server
* npm install
* sudo npm install -g pm2
* pm2 start index.js --name tax-app
* pm2 save

Then edit /etc/nginx/sites-available/default and, inside location / { ... }, add:
proxy_pass http://127.0.0.1:3000;
proxy_set_header Host $host;
add_header X-Served-By $hostname;

Test and restart Nginx
* sudo nginx -t && sudo systemctl restart nginx

  On Lb01
Edit /etc/nginx/sites-available/default:
upstream tax_backend {
    server 13.40.124.176 max_fails=1 fail_timeout=10s;
    server 13.135.67.110 max_fails=1 fail_timeout=10s;
}

server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://tax_backend;
        proxy_set_header Host $host;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}

Test and restart Nginx:
* sudo nginx -t && sudo systemctl restart nginx
Nginx alternates between the two servers (round-robin). If one server fails, proxy_next_upstream sends the request to the other one.

- Testing the Load Balancer
From your own computer:
* for i in 1 2 3 4 5 6; do curl -sI http://18.170.61.114 | grep X-Served-By; done
The answers alternate between 7414-web-01 and 7414-web-02.

Failover test:
1. Run pm2 stop tax-app on Web-01.
2. Run the same curl command again: it now returns only 7414-web-02 and the site stays online.
3. Restart with pm2 start tax-app

- Testing the application

+-------------------------------------+----------------------------------------+
|               Input                 |       Expected Result                  |
+-------------------------------------+----------------------------------------+
| 100,000 RWF, Standard, RWF, 0 months| VAT = 18,000 RWF, no penalty           |
+-------------------------------------+----------------------------------------+
| 100,000 RWF, Standard, RWF, 1 month | Penalty = 540 RWF, total = 18,540 RWF  |     late                                  |                                        |
+-------------------------------------+----------------------------------------+
| 100,000 RWF, Standard, RWF, 2 months| Penalty = 1,080 RWF, total = 19,080 RWF|
| late                                |                                        |
+-------------------------------------+----------------------------------------+ 
| 50,000 RWF, Exempt,2 months         | VAT = 0, penalty = 0                   |
| late                                |                                        |
+-------------------------------------+----------------------------------------+
| 100,000 RWF, Standard, USD          | VAT converted to about 12.17 USD       |
+-------------------------------------+----------------------------------------+
| Empty or negative amount            | Error message                          |
+-------------------------------------+----------------------------------------+
| Negative or decimal months late     | Error message                          |
+-------------------------------------+----------------------------------------+
| Text in the search box, then a      | History table is searched and filtered |
| category in filter                  |                                        |
+-------------------------------------+----------------------------------------+

- Challenges and solutions
Part 1: Local Application

1. CORS errors when calling the API
Challenge: calling the external API directly from the frontend could cause CORS(Cross-origin Resource Sharing) errors.
Solution: I created a proxy endpoint in the Express backend (/api/convert). The frontend calls my own server, which fetches the data from the external API and sends it back.

2. node_modules pushed to GitHub
Challenge: during the first commit, the heavy node_modules folder was staged by mistake.
Solution: I added node_modules to .gitignore and ran git rm -r --cached node_modules to clean the respitory before pushing again.

3. API down or slow
Challenge: if the API fails or takes too long. the frontend could freeze.
Solution: I used try/catch in the backend and checked response.ok in the frontend. If the API fails, the user sees a clear error message instead of a broken page.

4. Wrong Currency conversion
Challenge: the API rates use USD as the base, so the VAT in USD was equal to the VAT in RWF.
Solution: the amount is now converted with (VAT / rate[RWF]) * rate[currency].

5. Late penalty not showing and empty history
Challenge: after adding the late penalty, the button did nothing(a variable was declared twice) and the history table stayed empty(a typo field name).
Solution: I used node --check public/script.js to find syntax errors and the browser console (F12) to find runtime error, then fixed both.

Part 2: Deployment

1. Old Node.js on Ubuntu 20.04 caused a Syntax error.
Solution: I installed Node.js.20

2. Port 3000 was not reachable from outside.
Solution: I put Nginx on port 80 in front of the app.

3. 502 errors when one server was stopped.
Solution: I added proxy_next_upstream on load balancer so it retries on the other server.

### Credits
* Exchange rates by ExchangeRate-API 
* Node.js, Express, Nginx, pm2
* Servers provided by African Leadership University(ALU)
