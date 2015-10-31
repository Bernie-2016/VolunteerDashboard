# VolunteerDashboard

## Getting Started

To get up and running, first install [Vagrant](https://www.vagrantup.com) and then just run:

`vagrant up`

You'll be able to see the dashboard running at `http://localhost:7000`.  To stop the server (so that port 7000 becomes available again) run:

`vagrant stop`

Under the hood, when you run `vagrant up`, the app is using [Vagrant](https://www.vagrantup.com) to create and run inside a virtual machine.  Read more about it [here](https://docs.vagrantup.com/v2/).

## Deploying

Once you have permission to deploy, add the Heroku remote:

`git remote add heroku git@heroku.com:volunteer-dashboard.git`

Then you can deploy with

`git push heroku master`