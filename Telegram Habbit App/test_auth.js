// native fetch is available in Node 24
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const dataToUse = new URLSearchParams({
  user: JSON.stringify({
    id: 123456789,
    first_name: 'Dev',
    username: 'dev_user',
  }),
  auth_date: Math.floor(Date.now() / 1000).toString(),
  hash: 'mock_hash_for_local_testing',
}).toString();

fetch(`${SUPABASE_URL}/functions/v1/auth-telegram`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({ initData: dataToUse })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
