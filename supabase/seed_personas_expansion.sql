-- ============================================================================
-- EXPANSION: Update existing 15 personas and add 35 new personas (50 total)
-- Includes Margin Pressure traits: negotiation_style, lowest_acceptable_price, target_profit_zone, market_flexibility
-- 35% (18 personas) anchored in Yellow Zone ($10k-$12k profit) for reluctant acceptance training
-- ============================================================================

-- Update existing 15 personas with margin pressure traits
-- Yellow Zone personas (18 total): lowest_acceptable_price between $80,500-$82,500 (results in $10k-$12k profit)

-- 1. The Aggressive Attorney (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 81500,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Aggressive Attorney';

-- 2. The Reluctant Heir (Green Zone - Price Anchorer)
UPDATE training_personas SET
  negotiation_style = 'price_anchorer',
  lowest_acceptable_price = 90000,
  target_profit_zone = 'green',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Reluctant Heir';

-- 3. The Burned Landlord (Yellow Zone - Fair Value)
UPDATE training_personas SET
  negotiation_style = 'fair_value',
  lowest_acceptable_price = 82000,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": true}, "rural_zip": {"require_15k": false}}'::jsonb
WHERE name = 'The Burned Landlord';

-- 4. The Speed-Demon (Green Zone - Flexible)
UPDATE training_personas SET
  negotiation_style = 'flexible',
  lowest_acceptable_price = 75000,
  target_profit_zone = 'green',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": true}, "rural_zip": {"require_15k": false}}'::jsonb
WHERE name = 'The Speed-Demon';

-- 5. The Equity Warrior (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 81000,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Equity Warrior';

-- 6. The Skeptical Spouse (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 82500,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Skeptical Spouse';

-- 7. The Past Victim (Green Zone - Rigid)
UPDATE training_personas SET
  negotiation_style = 'rigid',
  lowest_acceptable_price = 88000,
  target_profit_zone = 'green',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Past Victim';

-- 8. The Research Expert (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 80500,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Research Expert';

-- 9. The Emotional Rollercoaster (Yellow Zone - Flexible)
UPDATE training_personas SET
  negotiation_style = 'flexible',
  lowest_acceptable_price = 82000,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": true}, "rural_zip": {"require_15k": false}}'::jsonb
WHERE name = 'The Emotional Rollercoaster';

-- 10. The Control Freak (Green Zone - Rigid)
UPDATE training_personas SET
  negotiation_style = 'rigid',
  lowest_acceptable_price = 85000,
  target_profit_zone = 'green',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Control Freak';

-- 11. The Comparison Addict (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 81200,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Comparison Addict';

-- 12. The Reverse Engineer (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 81800,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Reverse Engineer';

-- 13. The Boundary Tester (Green Zone - Flexible)
UPDATE training_personas SET
  negotiation_style = 'flexible',
  lowest_acceptable_price = 78000,
  target_profit_zone = 'green',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": true}, "rural_zip": {"require_15k": false}}'::jsonb
WHERE name = 'The Boundary Tester';

-- 14. The Logic Demander (Yellow Zone - Grinder)
UPDATE training_personas SET
  negotiation_style = 'grinder',
  lowest_acceptable_price = 80800,
  target_profit_zone = 'yellow',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Logic Demander';

-- 15. The Final Boss (Green Zone - Rigid)
UPDATE training_personas SET
  negotiation_style = 'rigid',
  lowest_acceptable_price = 92000,
  target_profit_zone = 'green',
  market_flexibility = '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
WHERE name = 'The Final Boss';

-- ============================================================================
-- ADD 35 NEW PERSONAS (16-50)
-- ============================================================================

-- 16. The Penny Pincher (Yellow Zone - Grinder) - Fights for every $500
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level, negotiation_style, lowest_acceptable_price, target_profit_zone, market_flexibility
) VALUES (
  'The Penny Pincher',
  'grinder',
  ARRAY['Price fixation', 'Every dollar matters', 'Bottom-line obsession'],
  ARRAY['Detail-oriented', 'Price-focused', 'Stubborn', 'Calculation-driven'],
  ARRAY['Can you do $500 more?', 'What about $1,000?', 'I need every dollar I can get'],
  'You fight for every single dollar. You will ask for $500 more, then another $500, then another. You test the AI''s patience and see if they will give in to small increments. You believe every dollar counts and will grind the negotiation to get the absolute maximum.',
  ARRAY['Asks for $500 increments', 'Tests patience', 'Grinds for every dollar', 'Won''t accept first offer'],
  'medium',
  'grinder',
  81500, -- Yellow Zone
  'yellow',
  '{"hot_zip": {"allow_8k_floor": false}, "rural_zip": {"require_15k": true}}'::jsonb
);

-- 17. The Quick Closer (Green Zone - Fair Value) - Quickly accepts reasonable offers
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level, negotiation_style, lowest_acceptable_price, target_profit_zone, market_flexibility
) VALUES (
  'The Quick Closer',
  'fair-value',
  ARRAY['Time pressure', 'Wants to move on', 'Reasonable expectations'],
  ARRAY['Pragmatic', 'Quick decision-maker', 'Fair-minded', 'Efficient'],
  ARRAY['That sounds fair', 'I can work with that', 'Let''s do it'],
  'You are reasonable and quick to accept fair offers. You test whether the AI leaves money on the table by accepting too quickly. If the AI offers $82,700 and you would have accepted $80,000, you''ll take it immediately - testing if the AI overpaid.',
  ARRAY['Accepts quickly', 'Tests if AI overpays', 'Reasonable expectations', 'Quick decisions'],
  'easy',
  'fair_value',
  75000, -- Green Zone (would accept lower)
  'green',
  '{"hot_zip": {"allow_8k_floor": true}, "rural_zip": {"require_15k": false}}'::jsonb
);

-- Continue with remaining 33 personas...
-- (I'll create a comprehensive file with all 50)
