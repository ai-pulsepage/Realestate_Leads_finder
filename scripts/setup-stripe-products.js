const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupProducts() {
  console.log('Setting up Stripe products and prices...\n');

  try {
    // 1. Contractor Monthly Plan
    const contractorProduct = await stripe.products.create({
      name: 'Contractor Plan',
      description: 'Access to new homeowner leads in Miami-Dade County',
      metadata: { type: 'subscription', tier: 'contractor' }
    });
    
    const contractorMonthly = await stripe.prices.create({
      product: contractorProduct.id,
      unit_amount: 4900,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: 'contractor_monthly'
    });

    const contractorYearly = await stripe.prices.create({
      product: contractorProduct.id,
      unit_amount: 49900,
      currency: 'usd',
      recurring: { interval: 'year' },
      lookup_key: 'contractor_yearly'
    });

    console.log('✅ Contractor Plan created');
    console.log('   Monthly:', contractorMonthly.id);
    console.log('   Yearly:', contractorYearly.id, '\n');

    // 2. Investor Monthly Plan
    const investorProduct = await stripe.products.create({
      name: 'Investor Plan',
      description: 'Access to distressed properties and FSBO leads in Miami-Dade County',
      metadata: { type: 'subscription', tier: 'investor' }
    });
    
    const investorMonthly = await stripe.prices.create({
      product: investorProduct.id,
      unit_amount: 4900,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: 'investor_monthly'
    });

    const investorYearly = await stripe.prices.create({
      product: investorProduct.id,
      unit_amount: 49900,
      currency: 'usd',
      recurring: { interval: 'year' },
      lookup_key: 'investor_yearly'
    });

    console.log('✅ Investor Plan created');
    console.log('   Monthly:', investorMonthly.id);
    console.log('   Yearly:', investorYearly.id, '\n');

    // 3. Combined Plan
    const combinedProduct = await stripe.products.create({
      name: 'Combined Plan',
      description: 'Full access to both contractor and investor leads',
      metadata: { type: 'subscription', tier: 'combined' }
    });
    
    const combinedMonthly = await stripe.prices.create({
      product: combinedProduct.id,
      unit_amount: 8999,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: 'combined_monthly'
    });

    const combinedYearly = await stripe.prices.create({
      product: combinedProduct.id,
      unit_amount: 89900,
      currency: 'usd',
      recurring: { interval: 'year' },
      lookup_key: 'combined_yearly'
    });

    console.log('✅ Combined Plan created');
    console.log('   Monthly:', combinedMonthly.id);
    console.log('   Yearly:', combinedYearly.id, '\n');

    // 4. Token Package 5K
    const tokens5k = await stripe.products.create({
      name: '5,000 Token Package',
      description: 'One-time purchase of 5,000 tokens',
      metadata: { type: 'token_package', tokens: '5000' }
    });
    
    const tokens5kPrice = await stripe.prices.create({
      product: tokens5k.id,
      unit_amount: 1000,
      currency: 'usd',
      lookup_key: 'tokens_5k'
    });

    console.log('✅ 5K Token Package created');
    console.log('   Price:', tokens5kPrice.id, '\n');

    // 5. Token Package 10K
    const tokens10k = await stripe.products.create({
      name: '10,000 Token Package',
      description: 'One-time purchase of 10,000 tokens',
      metadata: { type: 'token_package', tokens: '10000' }
    });
    
    const tokens10kPrice = await stripe.prices.create({
      product: tokens10k.id,
      unit_amount: 2000,
      currency: 'usd',
      lookup_key: 'tokens_10k'
    });

    console.log('✅ 10K Token Package created');
    console.log('   Price:', tokens10kPrice.id, '\n');

    console.log('🎉 All products created successfully!\n');

  } catch (error) {
    console.error('Error creating products:', error.message);
  }
}

setupProducts();
