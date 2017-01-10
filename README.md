# Cash Counter
Repository for team O2's entry in the January 2017 RBC Hackathon.

A demo of the app running on the Bluemix environment can be found here: 
[http://rbc-hackathon-o2.mybluemix.net](http://rbc-hackathon-o2.mybluemix.net).

The app uses MongoDB on Compose to store its sample data. The GUI console can be found here: 
[https://app.compose.io/team-o2/deployments](https://app.compose.io/team-o2/deployments).

## Installation
1. Install Node.js (version at least v6.9.2) https://nodejs.org/en/download/ and add the installation path to your PATH environment variable.
2. Clone this project to a local directory.
3. Navigate to the project root directory and run `npm install` on the command line.

## Starting the Server
1. At the project root directory, run `npm start`.
2. Open up a web browser and navigate to the url displayed in the command line.

## Bluemix Environment
Continuous integration is set up on Bluemix meaning any changes pushed to the Github repo should be reflected in the Bluemix environment
after a few minutes.

To deploy to Bluemix through the command line, follow these steps:

1. Log in to Bluemix: https://console.ng.bluemix.net/dashboard/apps
and click on the O2 app.
2. Under the 'All Apps' section, click on the app with the name 'O2'. Then, click on 'Getting Started' on the left hand pane.
3. Follow the instructions listed in that page. Note:
    1. After you install Cloud Foundry and Bluemix, add their installation paths to your PATH environment variable.
    2. Use this command to log in to Bluemix: `bluemix login -u <bluemix-user-email> -p <bluemix-user-password> -o "Team O2 Hackathon" -s "Globe Visualization"`.