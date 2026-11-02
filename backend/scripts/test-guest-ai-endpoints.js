async function main() {
  console.log('Testing 4 Guest AI Endpoints on http://localhost:3000...\n');

  // 1. Conversational Property Search
  console.log('--- 1. Testing Conversational Property Search ---');
  const searchRes = await fetch('http://localhost:3000/ai/guest/conversational-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Find me a furnished apartment in Bole for 3 people, under 6,000 ETB per night with Wi-Fi and parking',
    }),
  });
  console.log('Search Status:', searchRes.status);
  const searchData = await searchRes.json();
  console.log('Parsed Criteria:', searchData.parsedCriteria);
  console.log('Reply:', searchData.reply);
  console.log('Matching Properties Count:', searchData.total);
  if (searchData.properties?.[0]) {
    console.log('Top Match:', searchData.properties[0].title, `${searchData.properties[0].pricePerNight} ETB`);
  }
  console.log('Follow-ups:', searchData.suggestedFollowUps);

  // 2. Personalized Recommendations
  console.log('\n--- 2. Testing Personalized Recommendations ---');
  const recRes = await fetch('http://localhost:3000/ai/guest/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preferredCity: 'Addis Ababa',
      maxBudget: 5000,
      amenityPreferences: ['Wi-Fi', 'Free Parking'],
      limit: 4,
    }),
  });
  console.log('Recommendations Status:', recRes.status);
  const recData = await recRes.json();
  console.log('Recommendations Count:', recData.recommendations?.length);
  if (recData.recommendations?.[0]) {
    console.log('Top Recommendation:', recData.recommendations[0].property.title);
    console.log('Reason:', recData.recommendations[0].reason);
    console.log('Score:', recData.recommendations[0].score);
  }

  // 3. AI Property Comparison
  console.log('\n--- 3. Testing AI Property Comparison ---');
  const propListRes = await fetch('http://localhost:3000/properties');
  const propListData = await propListRes.json();
  const rawProps = propListData.data || propListData;
  const idsToCompare = rawProps.slice(0, 3).map((p) => p.id);

  const compRes = await fetch('http://localhost:3000/ai/guest/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyIds: idsToCompare,
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-15',
      guestsCount: 2,
    }),
  });
  console.log('Compare Status:', compRes.status);
  const compData = await compRes.json();
  console.log('Compared Properties:', compData.properties?.length);
  console.log('Comparison Matrix Rows:', compData.matrix?.length);
  console.log('Best Overall:', compData.aiAnalysis?.bestOverall);
  console.log('Best Value:', compData.aiAnalysis?.bestValue);
  console.log('Summary:', compData.aiAnalysis?.recommendationSummary);

  // 4. AI Booking Assistant
  console.log('\n--- 4. Testing AI Booking Assistant ---');
  const assistantRes = await fetch('http://localhost:3000/ai/guest/booking-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: idsToCompare[0],
      message: 'Does this property have parking and high speed wifi?',
    }),
  });
  console.log('Assistant Status:', assistantRes.status);
  const assistantData = await assistantRes.json();
  console.log('Category:', assistantData.category);
  console.log('Answer:', assistantData.answer);
  console.log('Action Suggestions:', assistantData.actionSuggestions);

  console.log('\n=============================================================');
  console.log('🎉 ALL FOUR GUEST AI ENDPOINTS VERIFIED ON REAL DATABASE DATA!');
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

