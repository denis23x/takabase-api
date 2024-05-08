const prompts = require('prompts');
const spawn = require('child_process').spawn;
const config = require('dotenv').config;

config({
  path: '.env.takabase-local',
  override: false
});

const projectList = {
  ['takabase-dev']: {
    url: 'https://takabase-dev-api.web.app'
  },
  ['takabase-prod']: {
    url: 'https://takabase-prod-api.web.app'
  },
};

(async () => {
  const project = await prompts({
    type: 'select',
    name: 'project',
    message: 'Select an environment',
    choices: [
      {
        title: 'takabase-dev',
        value: 'takabase-dev',
        description: 'https://takabase-dev-api.web.app',
      },
      {
        title: 'takabase-prod',
        value: 'takabase-prod',
        description: 'https://takabase-prod-api.web.app',
      },
    ],
    initial: 0
  });

  const action = await prompts({
    type: 'select',
    name: 'action',
    message: 'Select an action',
    choices: [
      {
        title: 'Deploy function',
        value: 'function',
        description: projectList[project.project].url,
      },
      {
        title: 'Deploy hosting',
        value: 'hosting',
        description: projectList[project.project].url,
      },
      {
        title: 'Prisma migrate',
        value: 'migration',
        description: 'https://prisma.io/docs/orm/prisma-migrate/getting-started',
      },
      {
        title: 'Prisma studio',
        value: 'studio',
        description: 'https://prisma.io/studio',
      },
      {
        title: 'Prisma seeding',
        value: 'seed',
        description: 'https://prisma.io/docs/orm/prisma-migrate/workflows/seeding',
        disabled: project.project === 'takabase-prod'
      },
    ],
    initial: 0
  });

  const confirm = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Can you confirm?',
    initial: project.value !== 'takabase-prod'
  });

  if (project.project && action.action && confirm.confirm) {
    const command = [`firebase use ${project.project}`];

    if (action.action === 'function') {
      command.push(`firebase deploy --only functions:api`);
    }

    if (action.action === 'hosting') {
      command.push(`firebase deploy --only hosting:${project.project}-api`);
    }

    if (action.action === 'migration') {
      command.push(`export MYSQL_DATABASE_URL=$(firebase functions:secrets:access MYSQL_DATABASE_URL)`);
      command.push(`npx prisma migrate deploy`);
    }

    if (action.action === 'studio') {
      command.push(`export MYSQL_DATABASE_URL=$(firebase functions:secrets:access MYSQL_DATABASE_URL)`);
      command.push(`npx prisma studio`);
    }

    if (action.action === 'seed') {
      command.push(`export MYSQL_DATABASE_URL=$(firebase functions:secrets:access MYSQL_DATABASE_URL)`);
      command.push(`export APP_STORAGE=https://firebasestorage.googleapis.com/v0/b/${project.project}.appspot.com`);
      command.push(`npx prisma db seed`);
    }

    /** RUN */

    spawn(command.join(' && '), {
      shell: true,
      stdio:'inherit'
    });
  } else {
    console.log('Ok, Bye!');
  }
})();
