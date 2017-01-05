# RBC-Hackathon
Repository for team O2's entry in the RBC Hackathon

## Installation
1. Install Node.js (version at least v6.9.2) https://nodejs.org/en/download/ and add the installation path to your PATH environment variable.
2. Clone this project to a local directory.
3. Navigate to the project root directory and run `npm install` on the command line.

## Starting the web server
1. At the project root directory, run `npm start`.
2. Open up a web browser and navigate to the url displayed by the command.

## Deploying to Bluemix
1. Log in to Bluemix: https://console.ng.bluemix.net/dashboard/apps
and click on the O2 app.
2. Under the 'All Apps' section, click on the app with the name 'O2'. Then, click on 'Getting Started' on the left hand pane.
3. Follow the instructions listed in that page. Note:
    1. After you install Cloud Foundry and Bluemix, add their installation paths to your PATH environment variable.
    2. Use this command to log in to Bluemix: `bluemix login -u <bluemix-user-email> -p <bluemix-user-password> -o "Team O2 Hackathon" -s "Globe Visualization"`.