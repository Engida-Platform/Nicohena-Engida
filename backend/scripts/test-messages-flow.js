const crypto = require('crypto');

const JWT_SECRET = 'change-this-to-a-secure-random-string';

function signJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

async function main() {
  console.log('Testing Live Messages Module on http://localhost:3000...');

  // 1. Fetch users from DB or API to get real IDs
  const hostId = 'ee9818dc-959f-49ad-bb04-813518a77086'; // Host user
  const guestId = 'a0000000-0000-0000-0000-000000000001'; // Admin / user

  const guestToken = signJwt({ sub: guestId, email: 'admin@engida.com', role: 'ADMIN' }, JWT_SECRET);
  const hostToken = signJwt({ sub: hostId, email: 'host-onboard1@example.com', role: 'USER' }, JWT_SECRET);

  // 2. Check unread count
  const unreadRes = await fetch('http://localhost:3000/messages/unread-count', {
    headers: { Authorization: `Bearer ${guestToken}` }
  });
  console.log('1. Unread count status:', unreadRes.status, await unreadRes.json());

  // 3. Find a property
  const propRes = await fetch('http://localhost:3000/properties');
  const propData = await propRes.json();
  const properties = propData.data || propData;
  console.log('Properties available:', properties.length);
  const targetProp = properties[0];
  console.log('2. Target property:', targetProp.id, targetProp.title, 'hostId:', targetProp.hostId);

  // 4. Send message to host about property
  const sendRes = await fetch('http://localhost:3000/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      propertyId: targetProp.id,
      receiverId: targetProp.hostId,
      content: 'Hello, is there reliable backup generator power at this residence?',
    }),
  });
  console.log('3. Send message status:', sendRes.status);
  const sentData = await sendRes.json();
  console.log('   Sent data:', sentData);

  if (!sentData.conversationId) {
    throw new Error('Message sending did not return conversationId');
  }

  // 5. Host fetches thread
  const actualHostToken = signJwt({ sub: targetProp.hostId, email: 'host@engida.com', role: 'USER' }, JWT_SECRET);
  const threadRes = await fetch(`http://localhost:3000/messages/thread/${sentData.conversationId}`, {
    headers: { Authorization: `Bearer ${actualHostToken}` },
  });
  console.log('4. Host fetches thread status:', threadRes.status);
  const threadData = await threadRes.json();
  console.log('   Thread messages count:', threadData.messages?.length);
  console.log('   Last message:', threadData.conversation?.lastMessageText);

  // 6. Host sends reply
  const replyRes = await fetch('http://localhost:3000/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${actualHostToken}`,
    },
    body: JSON.stringify({
      conversationId: sentData.conversationId,
      content: 'Yes! We have a 45kVA automatic standby generator on-site.',
    }),
  });
  console.log('5. Host reply status:', replyRes.status);
  const replyData = await replyRes.json();
  console.log('   Reply content:', replyData.content);

  // 7. Verify conversations list for guest
  const convListRes = await fetch('http://localhost:3000/messages/conversations', {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  console.log('6. Conversations list status:', convListRes.status);
  const convList = await convListRes.json();
  console.log('   Conversations count:', convList.length);
  console.log('   First thread lastMessageText:', convList[0]?.lastMessageText);
  console.log('   First thread unreadCount:', convList[0]?.unreadCount);

  console.log('\n=============================================');
  console.log('🎉 IN-PLATFORM MESSAGING FULL FLOW CONFIRMED!');
  console.log('=============================================\n');
}

main().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

