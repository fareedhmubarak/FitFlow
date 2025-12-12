const https = require('https');

const PROD_PROJECT = 'dbtdarmxvgbxeinwcxka';
const PROD_TOKEN = 'sbp_5bb1bf1e2e0e50a75b938043534196099a963b6f';

const QUERY = `
SELECT 
    u.email,
    u.full_name,
    u.role,
    u.auth_user_id,
    g.name as gym_name
FROM gym_users u
LEFT JOIN gym_gyms g ON g.id = u.gym_id
ORDER BY g.name;
`;

const data = JSON.stringify({ query: QUERY });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROD_PROJECT}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PROD_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    const result = JSON.parse(body);
    console.log('\n📋 ALL GYM USERS IN PRODUCTION\n');
    console.log('===========================================');
    if (result && result.length > 0) {
      result.forEach(r => {
        console.log(`Gym: ${r.gym_name}`);
        console.log(`Email: ${r.email}`);
        console.log(`Name: ${r.full_name}`);
        console.log(`Role: ${r.role}`);
        console.log(`Auth User ID: ${r.auth_user_id || 'NOT LINKED'}`);
        console.log('---');
      });
    } else {
      console.log('No users found');
    }
  });
});

req.on('error', console.error);
req.write(data);
req.end();
