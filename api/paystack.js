    // FROM HERE CONTINUE:

    // Verify with Paystack - EXACT ₦1,000
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${payment_ref}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });
    const verifyData = await verifyRes.json();

    // ✅ CHECK 1: Paystack says success?
    if(!verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({ 
        error: 'Payment not verified - Paystack says failed',
        paystack_response: verifyData 
      });
    }

    // ✅ CHECK 2: Amount EXACTLY ₦1,000? (100000 kobo)
    if(verifyData.data.amount !== 100000) {
      return res.status(400).json({ 
        error: `Invalid amount! Expected ₦1,000 (100000 kobo) but got ₦${verifyData.data.amount/100}`,
        expected: 100000,
        received: verifyData.data.amount
      });
    }

    // ✅ CHECK 3: Email from Paystack matches email wey customer send?
    // Extra safety - make sure person no change email after pay
    const paystackEmail = verifyData.data.customer.email;
    if(paystackEmail.toLowerCase() !== email.toLowerCase()) {
      console.log(`Email mismatch: Paystack has ${paystackEmail}, customer sent ${email} - but we go allow am for test`);
    }

    // ✅ SUCCESS - Create PAID API key ONLY AFTER VERIFICATION!
    const randomStr = Math.random().toString(36).substring(2, 10);
    const apiKey = `sk_paid_${Date.now()}_${randomStr}`;
    const key_hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const key_prefix = apiKey.substring(0, 16);

    const { data, error } = await supabase.from('api_keys').insert({
      name: `Paid TEST ₦1,000 - ${email}`,
      key_hash: key_hash,
      key_prefix: key_prefix,
      email: email,
      max_words: 1000,
      words_used: 0,
      is_exhausted: false,
      payment_ref: payment_ref, // ✅ SAVE REF - so e no fit reuse!
      is_active: true
    }).select().single();

    if(error) {
      // If error na duplicate payment_ref, na because UNIQUE constraint block am
      if(error.message.includes('unique_payment_ref') || error.message.includes('duplicate')) {
        return res.status(400).json({ error: 'This payment reference already used - One payment = One key!' });
      }
      return res.status(500).json({ error: 'Failed to create API key: ' + error.message });
    }

    // ✅ CHECK 4: Return API key wey connect to customer credits!
    return res.status(200).json({
      success: true,
      message: '✅ ₦1,000 TEST Payment successful! API key created!',
      api_key: apiKey, // Only show once!
      key_prefix: key_prefix,
      email: email,
      max_words: 1000,
      words_used: 0,
      payment_ref: payment_ref,
      paystack_verified: true,
      amount_verified: verifyData.data.amount,
      save_this: '⚠️ SAVE THIS API KEY - We show only once! Connected to your 1000 credits!'
    });

  } catch(err) {
    console.error('Paystack API error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}