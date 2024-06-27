/** @format */

import prompts from 'prompts';
import { spawnSync } from 'child_process';

const projectList: any = {
  ['takabase-dev']: {
    url: 'https://takabase-dev-api.web.app'
  },
  ['takabase-prod']: {
    url: 'https://takabase-prod-api.web.app'
  }
};

(async () => {
  const project: prompts.Answers<string> = await prompts({
    type: 'select',
    name: 'project',
    message: 'Select an environment',
    choices: Object.keys(projectList).map(key => {
      return {
        title: key,
        value: key,
        description: projectList[key].url
      };
    }),
    initial: 0
  });

  const action: prompts.Answers<string> = await prompts({
    type: 'select',
    name: 'action',
    message: 'Select an action',
    choices: [
      {
        title: 'Deploy function',
        value: 'function',
        description: projectList[project.project].url
      },
      {
        title: 'Deploy hosting',
        value: 'hosting',
        description: projectList[project.project].url
      },
      {
        title: 'Prisma migrate',
        value: 'migration',
        description: 'https://prisma.io/docs/orm/prisma-migrate/getting-started'
      },
      {
        title: 'Prisma seeding',
        value: 'seed',
        description: 'https://prisma.io/docs/orm/prisma-migrate/workflows/seeding',
        disabled: project.project === 'takabase-prod'
      }
    ],
    initial: 0
  });

  const confirm: prompts.Answers<string> = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Can you confirm?',
    initial: project.project !== 'takabase-prod'
  });

  if (project.project && action.action && confirm.confirm) {
    const command: string[] = [`firebase use ${project.project}`];

    if (action.action === 'function') {
      command.push(`firebase deploy --only functions:api`);
    }

    if (action.action === 'hosting') {
      command.push(`firebase deploy --only hosting:${project.project}-api`);
    }

    if (action.action === 'migration') {
      command.push(`export API_DATABASE_URL=$(firebase functions:secrets:access API_DATABASE_URL)`);
      command.push(`export API_DATABASE_DIRECT_URL=$(firebase functions:secrets:access API_DATABASE_DIRECT_URL)`);
      command.push(`npx prisma migrate deploy`);
    }

    if (action.action === 'seed') {
      command.push(`export API_DATABASE_URL=$(firebase functions:secrets:access API_DATABASE_URL)`);
      command.push(`export API_DATABASE_DIRECT_URL=$(firebase functions:secrets:access API_DATABASE_DIRECT_URL)`);
      command.push(`export APP_STORAGE=https://firebasestorage.googleapis.com/v0/b/${project.project}.appspot.com`);
      command.push(`npx prisma db seed`);
    }

    /** RUN */

    spawnSync(command.join(' && '), {
      shell: true,
      stdio: 'inherit'
    });
  } else {
    console.log('Ok, Bye!');
  }
})();
