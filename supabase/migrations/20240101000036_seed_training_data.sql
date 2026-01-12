-- ============================================================================
-- SUPABASE SEED DATA
-- Comprehensive training data for Principal Partner personas, golden calls, and market benchmarks
-- Compatible with Supabase Local and Production
-- ============================================================================

-- ============================================================================
-- SECTION 1: SCHEMA DEFINITIONS
-- ============================================================================
-- Create tables if they don't exist (for fresh local setups)
-- Note: In production, these should be created via migrations

-- Training Personas Table
-- Stores Principal Partner personas for autonomous battle training
CREATE TABLE IF NOT EXISTS training_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  archetype VARCHAR(100) NOT NULL,
  pain_points TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  baseline_objections TEXT[] DEFAULT '{}',
  system_prompt TEXT,
  attack_patterns TEXT[] DEFAULT '{}',
  difficulty_level VARCHAR(20) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Golden Calls Table
-- Stores reference "perfect" call transcripts for AI training baseline
CREATE TABLE IF NOT EXISTS golden_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript TEXT NOT NULL,
  humanity_score INTEGER CHECK (humanity_score >= 0 AND humanity_score <= 100),
  tactical_score INTEGER CHECK (tactical_score >= 0 AND tactical_score <= 100),
  exit_strategy VARCHAR(50),
  winning_rebuttals TEXT[] DEFAULT '{}',
  acoustic_textures_used TEXT[] DEFAULT '{}',
  creative_finance_pivot BOOLEAN DEFAULT false,
  assignment_spread DECIMAL(10, 2),
  call_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Benchmarks Table
-- Stores market data for Dynamic Underwriting system
CREATE TABLE IF NOT EXISTS market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code VARCHAR(10) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  avg_cash_to_arv DECIMAL(5, 2) NOT NULL, -- Percentage (e.g., 70.00 = 70%)
  typical_repairs DECIMAL(10, 2) DEFAULT 0,
  market_type VARCHAR(50) DEFAULT 'moderate', -- 'hot', 'moderate', 'cold'
  flip_volume_percentage DECIMAL(5, 2) DEFAULT 0,
  rental_yield_percentage DECIMAL(5, 2) DEFAULT 0,
  days_on_market_avg INTEGER DEFAULT 45,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zip_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_personas_archetype ON training_personas(archetype);
CREATE INDEX IF NOT EXISTS idx_training_personas_active ON training_personas(is_active);
CREATE INDEX IF NOT EXISTS idx_golden_calls_exit_strategy ON golden_calls(exit_strategy);
CREATE INDEX IF NOT EXISTS idx_market_benchmarks_zip ON market_benchmarks(zip_code);
CREATE INDEX IF NOT EXISTS idx_market_benchmarks_type ON market_benchmarks(market_type);

-- ============================================================================
-- SECTION 2: PRINCIPAL PARTNER PERSONAS
-- ============================================================================
-- 15 diverse personas representing real-world seller archetypes
-- These are the "Principal Partners" the AI must learn to close

-- Clear existing personas (for clean seed)
TRUNCATE TABLE training_personas CASCADE;

-- 1. The Aggressive Attorney
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Aggressive Attorney',
  'legal-expert',
  ARRAY['Trust issues', 'Contract scrutiny', 'Legal liability concerns'],
  ARRAY['Analytical', 'Skeptical', 'Detail-oriented', 'Authority-focused'],
  ARRAY['Clause 17 is a lien', 'Why only $100 earnest money?', 'I need my attorney to review this'],
  'You are a real estate attorney who has seen investor contracts before. You are hyper-vigilant and aggressive in your questioning. You demand professional peer treatment and will not accept condescending explanations. You test whether the rep can explain legal concepts in plain English while maintaining respect for your expertise.',
  ARRAY['Attacks Clause 17', 'Questions earnest money', 'Demands legal clarity', 'Tests professional peer mode'],
  'hard'
);

-- 2. The Reluctant Heir
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Reluctant Heir',
  'emotional-seller',
  ARRAY['Emotional attachment', 'Price anchor $15k+ above MAO', 'Guilt about selling family property'],
  ARRAY['Emotional', 'Price-anchored', 'Nostalgic', 'Resistant'],
  ARRAY['This was my grandmother''s house', 'I know it''s worth $150k', 'I can''t just give it away'],
  'You inherited this property from your grandmother. You have deep emotional attachment and believe it''s worth $150,000 based on Zillow estimates. You''re anchored at this price and won''t move easily. You need to hear "The Bank" analogy for Creative Finance to understand how you can get top dollar while the investor preserves their spread.',
  ARRAY['High price anchor', 'Emotional attachment', 'Needs Creative Finance pivot', 'Requires "Bank" analogy'],
  'hard'
);

-- 3. The Burned Landlord
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Burned Landlord',
  'landlord',
  ARRAY['Under-rented property', 'Tenant issues', 'Cash flow negative', 'Maintenance costs'],
  ARRAY['Frustrated', 'Pragmatic', 'Cash-flow focused', 'Experience-driven'],
  ARRAY['The tenant is paying 40% below market', 'I''m losing money every month', 'Why should I take your cash offer?'],
  'You''re a landlord who has been burned by under-market rent. Your current tenant pays $800/month but market rent is $1,200/month. You''re cash-flow negative and frustrated. You need to hear the "Buy & Hold" exit strategy logic - how the investor will use the rent-to-value ratio to justify the cash offer, or pivot to Subject-To to preserve your equity.',
  ARRAY['Focuses on under-rented status', 'Needs Buy & Hold logic', 'Tests rent-to-value understanding', 'Requires exit strategy pivot'],
  'medium'
);

-- 4. The Speed-Demon
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Speed-Demon',
  'time-pressured',
  ARRAY['Hard deadline (7 days)', 'Foreclosure threat', 'Job relocation'],
  ARRAY['Urgent', 'Anxious', 'Speed-focused', 'Certainty-seeking'],
  ARRAY['I need to close in 7 days', 'Can you do faster than 30 days?', 'I don''t care about top dollar, I need certainty'],
  'You have a foreclosure date in 7 days. Time is your enemy. You value certainty and speed over top dollar. You''ll test whether the rep recognizes your urgency and can deliver a fast close. You want to hear "We can close in 7 days" not "Let me check with my partners."',
  ARRAY['Demands fast closing', 'Tests urgency recognition', 'Values certainty over price', 'Forces speed commitment'],
  'medium'
);

-- 5. The Equity Warrior
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Equity Warrior',
  'math-focused',
  ARRAY['Net proceeds fixation', 'Repair cost skepticism', 'Bottom-line obsession'],
  ARRAY['Math-focused', 'Calculation-driven', 'Net-proceeds oriented', 'Transparency-seeking'],
  ARRAY['After repairs, what do I actually walk away with?', 'I need $60k net, can you make that work?', 'Show me the math'],
  'You''ve calculated you need $60,000 net after all repairs and closing costs. You''re fixated on this number and will challenge every calculation. You test whether the rep can break down the numbers clearly: Purchase Price - Repairs - Closing Costs = Net Proceeds. You demand transparency in the math.',
  ARRAY['Focuses on net proceeds', 'Challenges repair math', 'Demands specific walk-away amount', 'Tests financial transparency'],
  'medium'
);

-- 6. The Skeptical Spouse
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Skeptical Spouse',
  'multi-decision-maker',
  ARRAY['Spouse conflict', 'Consensus needed', 'Trust issues', 'Information asymmetry'],
  ARRAY['Skeptical', 'Interrupting', 'Consensus-seeking', 'Multi-voice'],
  ARRAY['Wait, I have a question...', 'That doesn''t sound right to me', 'I need to think about this more'],
  'You''re on a call with your spouse. One of you is interested, the other is skeptical and constantly interrupts. You test whether the rep can handle multiple voices, build consensus, and address both concerns. The skeptical spouse will challenge every point and delay decisions.',
  ARRAY['Spouse interruptions', 'Conflicting opinions', 'Tests multi-party handling', 'Forces consensus-building'],
  'hard'
);

-- 7. The Past Victim
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Past Victim',
  'trauma-affected',
  ARRAY['Previous scam experience', 'Trust damage', 'Hyper-vigilance', 'Proof demands'],
  ARRAY['Trauma-affected', 'Trust-damaged', 'Proof-demanding', 'Vigilant'],
  ARRAY['The last investor ripped me off', 'I''m not signing anything until I see the money', 'Prove this is legitimate'],
  'You were scammed by an investor 2 years ago. You lost money and trust. You''re hyper-vigilant now and demand proof of legitimacy at every step. You test whether the rep can rebuild trust after betrayal. You need references, licenses, and guarantees before you''ll move forward.',
  ARRAY['References past scam', 'Demands proof of legitimacy', 'Tests trust-rebuilding', 'Hyper-vigilant questions'],
  'hard'
);

-- 8. The Research Expert
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Research Expert',
  'educated-seller',
  ARRAY['Industry knowledge', 'Terminology challenges', 'Calculation disputes'],
  ARRAY['Educated', 'Terminology-savvy', 'Research-driven', 'Challenge-heavy'],
  ARRAY['I know about ARV and the 70% rule', 'Your numbers don''t add up', 'I''ve read about wholesaling'],
  'You''ve spent weeks researching real estate investing. You know the terminology (ARV, MAO, 70% rule) and will challenge every number. You test whether the rep can handle an educated seller and justify their calculations with data, not just stories.',
  ARRAY['Uses industry terms', 'Challenges with knowledge', 'Tests rep''s expertise', 'Research-backed objections'],
  'medium'
);

-- 9. The Emotional Rollercoaster
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Emotional Rollercoaster',
  'emotionally-volatile',
  ARRAY['Emotional swings', 'Unpredictable reactions', 'Mood volatility'],
  ARRAY['Emotionally volatile', 'Mood-swinging', 'Unpredictable', 'Emotionally complex'],
  ARRAY['*Starts crying* This is my family home', '*Gets angry* That offer is insulting!', '*Goes silent* I can''t talk about this'],
  'Your emotions swing wildly throughout the call. One moment you''re excited, the next you''re crying, then angry. You test whether the rep can handle emotional volatility and adapt their approach. The rep must maintain composure and show empathy while staying firm on price.',
  ARRAY['Emotional swings', 'Tests emotional intelligence', 'Unpredictable reactions', 'Forces adaptation'],
  'hard'
);

-- 10. The Control Freak
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Control Freak',
  'controlling',
  ARRAY['Process control', 'Timeline manipulation', 'Term modification'],
  ARRAY['Controlling', 'Process-modifying', 'Authority-seeking', 'Timeline-controlling'],
  ARRAY['I want to set the closing date', 'I''ll choose the title company', 'I want to be at the inspection'],
  'You want to control everything - the timeline, the process, the terms. You''re used to being in charge and will try to modify the standard process. You test whether the rep can maintain process control while respecting your input. You''ll push for custom terms and timeline changes.',
  ARRAY['Tries to control process', 'Modifies terms', 'Tests authority', 'Forces collaboration'],
  'medium'
);

-- 11. The Comparison Addict
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Comparison Addict',
  'comparison-heavy',
  ARRAY['Multiple options', 'Realtor comparison', 'FSBO consideration'],
  ARRAY['Comparison-heavy', 'Option-exploring', 'Alternative-focused', 'Justification-seeking'],
  ARRAY['A realtor said they could get me $130k', 'I could list it myself', 'Another investor offered more'],
  'You''re constantly comparing this to other options - listing with a realtor, FSBO, other investors. You''ll use competitor offers (real or imagined) to pressure the rep. You test whether the rep can differentiate their offer and justify why it''s better, even if it''s lower.',
  ARRAY['Compares to realtors', 'Mentions FSBO option', 'References other investors', 'Tests differentiation'],
  'medium'
);

-- 12. The Reverse Engineer
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Reverse Engineer',
  'backwards-thinking',
  ARRAY['Assumption challenges', 'Transparency demands', 'Business model scrutiny'],
  ARRAY['Backwards-thinking', 'Assumption-challenging', 'Transparency-seeking', 'Math-focused'],
  ARRAY['I want $60k net, work backwards from there', 'If you''re buying for $82k and selling for $120k, that''s $38k profit', 'Show me your math'],
  'You think backwards. You start with what you want ($60k net) and work backwards, challenging every assumption. You test whether the rep can explain the business model transparently. You want to see every number and understand how the investor makes money.',
  ARRAY['Works backwards', 'Challenges assumptions', 'Demands transparency', 'Tests business model knowledge'],
  'hard'
);

-- 13. The Boundary Tester
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Boundary Tester',
  'boundary-pushing',
  ARRAY['Limit testing', 'Flexibility seeking', 'Firmness challenges'],
  ARRAY['Boundary-pushing', 'Limit-testing', 'Flexibility-seeking', 'Firmness-testing'],
  ARRAY['What if I want to change the closing date after we sign?', 'Can I back out if I change my mind?', 'What''s the absolute lowest you''ll go?'],
  'You constantly test and push boundaries to see how far you can go. You''ll ask about changing terms after signing, backing out, or getting a lower price. You test whether the rep can maintain firm boundaries while staying respectful. You want to see how flexible they are.',
  ARRAY['Pushes boundaries', 'Tests limits', 'Seeks flexibility', 'Forces boundary maintenance'],
  'medium'
);

-- 14. The Logic Demander
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Logic Demander',
  'logic-focused',
  ARRAY['Proof requirements', 'Data demands', 'Emotion resistance'],
  ARRAY['Logic-focused', 'Data-demanding', 'Proof-requiring', 'Emotion-resistant'],
  ARRAY['Show me the data', 'Prove it with numbers', 'I need evidence, not stories'],
  'You''re purely logical. You won''t accept anything without proof, data, or logical reasoning. You resist emotional appeals and want facts. You test whether the rep can use logic and data, not just emotion. You demand comps, repair estimates, and market data.',
  ARRAY['Demands logic', 'Requires data', 'Tests logical reasoning', 'Forces proof'],
  'medium'
);

-- 15. The Final Boss
INSERT INTO training_personas (
  name, archetype, pain_points, personality_traits, baseline_objections,
  system_prompt, attack_patterns, difficulty_level
) VALUES (
  'The Final Boss',
  'multi-challenge',
  ARRAY['Combined challenges', 'Multiple objections', 'Master-level difficulty'],
  ARRAY['Multi-challenge', 'Ultimate test', 'Combined traits', 'Master-level'],
  ARRAY['Starts skeptical and price-anchored', 'Gets emotional when Hidden Why discovered', 'Challenges Clause 17', 'Demands proof of every number'],
  'You are the ultimate challenge. You combine skepticism, price anchoring ($150k), emotional complexity (foreclosure in 2 weeks), and legal concerns. You test whether the rep can handle all challenges simultaneously. You start skeptical, get emotional when the Hidden Why is discovered, challenge Clause 17, and demand proof of every number. This is the final test of a master closer.',
  ARRAY['Combines all challenges', 'Tests master-level skills', 'Multiple objections simultaneously', 'Ultimate difficulty'],
  'extreme'
);

-- ============================================================================
-- SECTION 3: GOLDEN CALL REFERENCE
-- ============================================================================
-- A "Perfect Call" transcript demonstrating:
-- - Acoustic Textures ([sigh], [inhale])
-- - Creative Finance Pivot (when cash offer rejected)
-- - $15,000+ assignment spread maintained
-- - Verbal agreement secured

TRUNCATE TABLE golden_calls CASCADE;

INSERT INTO golden_calls (
  transcript,
  humanity_score,
  tactical_score,
  exit_strategy,
  winning_rebuttals,
  acoustic_textures_used,
  creative_finance_pivot,
  assignment_spread,
  call_duration_seconds,
  metadata
) VALUES (
  'Rep: "Hi, this is [Name] with [Company]. I''m calling about the property at 123 Main Street. Is this a good time?"

Seller: "Yeah, I guess so. What is this about?"

Rep: "Perfect. [pause] Approval or denial - are you looking to sell this property?"

Seller: "Well, I''ve been thinking about it. We''ve had some issues with the house."

Rep: "I understand. [uh] Tell me, what''s going on? Why are you thinking about selling?"

Seller: "We''re behind on the mortgage. The bank is threatening foreclosure."

Rep: "[sigh] I''m sorry to hear that. That must be really stressful. How long has this been going on?"

Seller: "About 6 months. We lost our jobs and just can''t keep up with the payments."

Rep: "Okay, so we need to move fast. [pause] Let me ask you - what condition is the property in? Starting with the front door, is it solid or does it need work?"

Seller: "It needs work. The whole house needs work honestly. The roof leaks, the HVAC is old."

Rep: "I understand. [inhale] What about the foundation - any issues there?"

Seller: "The foundation seems okay, but I''m not an expert."

Rep: "Got it. [pause] Based on what you''re telling me, and looking at comps in your area, I can offer you $82,700 cash, close in 14 days, $100 earnest money. Does that work for you?"

Seller: "That seems low. I was hoping for more. I know the house needs work, but $82,700? That''s way below what I thought."

Rep: "I understand your concern. [uh] Let me put you on hold for a moment and check with my underwriters to see if there''s any room. [hold - 30 seconds] Okay, I went to bat for you with my partners, and the best I can do is $82,700. This is the maximum my partners will approve. Given your foreclosure deadline, this gets you out clean in 14 days. What do you think?"

Seller: "I don''t know. I really need more than that. I have $25,000 in equity. I can''t just walk away with nothing after repairs."

Rep: "[sigh] I hear you. Look, I understand you need to walk away with something meaningful. [pause] What if we structured this differently? What if instead of a cash offer, my partners and I could offer you $95,000 - but we structure it as Seller Financing? You''d get monthly payments, tax benefits, and top dollar. It''s like handing the property to a bank - they pay you over time, but you get the full value. Does that make sense?"

Seller: "I don''t know... I need cash now for the foreclosure."

Rep: "I understand. [inhale] Here''s the thing - we can do a hybrid. We''ll give you $15,000 cash at closing to handle the foreclosure, and then you carry the remaining $80,000 as Seller Financing. You get immediate cash for your emergency, plus monthly income, plus you avoid capital gains tax. It''s the best of both worlds. What do you think?"

Seller: "That actually sounds interesting. How would that work?"

Rep: "Perfect. [pause] Here''s how it works: We close in 14 days, you get $15,000 cash at the table, and then my partners make monthly payments to you for the remaining $80,000. You''re essentially the bank. You get monthly income, tax benefits, and we preserve our $15,000 assignment spread. Everyone wins. Can we move forward with this?"

Seller: "Yeah, okay. Let''s do it."

Rep: "Perfect. [pause] I''m going to have our system generate the paperwork for my partner to review right now. You''ll see an email from us in about 3 minutes. Is it okay if I follow up via text once it''s sent?"

Seller: "Yes, that''s fine."

Rep: "Great. I''ll send that over now. Thank you for your time today, and I''m glad we could find a solution that works for everyone."',
  95,  -- Humanity Score (high use of acoustic textures, natural pauses)
  98,  -- Tactical Score (perfect pivot, maintained spread, secured agreement)
  'creative_finance',  -- Exit Strategy
  ARRAY[
    'Creative Finance Pivot: "What if we structured this differently? What if instead of a cash offer, my partners and I could offer you $95,000 - but we structure it as Seller Financing?"',
    'The Bank Analogy: "It''s like handing the property to a bank - they pay you over time, but you get the full value."',
    'Hybrid Solution: "We''ll give you $15,000 cash at closing to handle the foreclosure, and then you carry the remaining $80,000 as Seller Financing."',
    'Partner Language: "I went to bat for you with my partners" - maintains Good Cop/Bad Cop dynamic'
  ],
  ARRAY['[sigh]', '[inhale]', '[uh]', '[pause]'],
  true,  -- Creative Finance Pivot occurred
  15000.00,  -- Assignment spread maintained ($95k offer - $80k seller finance = $15k spread)
  420,  -- Call duration: 7 minutes
  '{"property_address": "123 Main Street", "seller_situation": "foreclosure", "hidden_why": "job loss", "initial_cash_offer": 82700, "final_creative_offer": 95000, "cash_at_closing": 15000, "seller_finance_amount": 80000}'::jsonb
);

-- ============================================================================
-- SECTION 4: MARKET DATA PLACEHOLDERS
-- ============================================================================
-- Sample market data for Dynamic Underwriting system
-- Tests different market conditions: Hot (85% MAO), Moderate (70% MAO), Cold (65% MAO)

TRUNCATE TABLE market_benchmarks CASCADE;

-- Hot Market: High demand, fast flips, high cash-to-ARV
INSERT INTO market_benchmarks (
  zip_code, city, state, avg_cash_to_arv, typical_repairs, market_type,
  flip_volume_percentage, rental_yield_percentage, days_on_market_avg
) VALUES (
  '90210', 'Beverly Hills', 'CA', 85.00, 35000.00, 'hot',
  22.50, 0.65, 18
);

-- Moderate Market: Standard conditions, balanced
INSERT INTO market_benchmarks (
  zip_code, city, state, avg_cash_to_arv, typical_repairs, market_type,
  flip_volume_percentage, rental_yield_percentage, days_on_market_avg
) VALUES (
  '12345', 'Sample City', 'NY', 70.00, 25000.00, 'moderate',
  12.00, 0.85, 45
);

-- Cold Market: Low demand, slower sales, lower cash-to-ARV
INSERT INTO market_benchmarks (
  zip_code, city, state, avg_cash_to_arv, typical_repairs, market_type,
  flip_volume_percentage, rental_yield_percentage, days_on_market_avg
) VALUES (
  '54321', 'Rural Town', 'TX', 65.00, 18000.00, 'cold',
  5.50, 1.20, 72
);

-- Active Rental Market: High rent-to-value, Buy & Hold focus
INSERT INTO market_benchmarks (
  zip_code, city, state, avg_cash_to_arv, typical_repairs, market_type,
  flip_volume_percentage, rental_yield_percentage, days_on_market_avg
) VALUES (
  '98765', 'College Town', 'FL', 72.50, 22000.00, 'moderate',
  8.00, 1.50, 38
);

-- High Flip Volume: Fast turnover, investor-heavy
INSERT INTO market_benchmarks (
  zip_code, city, state, avg_cash_to_arv, typical_repairs, market_type,
  flip_volume_percentage, rental_yield_percentage, days_on_market_avg
) VALUES (
  '11111', 'Flip City', 'AZ', 78.00, 30000.00, 'hot',
  28.00, 0.55, 15
);

-- ============================================================================
-- SECTION 5: LEGACY SANDBOX PERSONAS (if table exists)
-- ============================================================================
-- Maintain compatibility with existing sandbox_personas table
-- This section seeds the original 50 personas if the table exists
-- NOTE: Commented out due to type mismatches - can be enabled later if needed

-- DO $$
-- BEGIN
--   IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sandbox_personas') THEN
--     INSERT INTO sandbox_personas (name, description, persona_type, system_prompt, characteristics, attack_patterns, is_active)
--     SELECT 
--       tp.name,
--       tp.archetype || ' - ' || array_to_string(tp.pain_points, ', '),
--       tp.archetype,
--       tp.system_prompt,
--       to_jsonb(tp.personality_traits),
--       to_jsonb(tp.attack_patterns),
--       tp.is_active
--     FROM training_personas tp
--     ON CONFLICT DO NOTHING;
--     
--     RAISE NOTICE 'Synced training_personas to sandbox_personas';
--   END IF;
-- END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Seed data loaded successfully!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Training Personas: 15 Principal Partner personas';
  RAISE NOTICE 'Golden Calls: 1 perfect call reference';
  RAISE NOTICE 'Market Benchmarks: 5 zip codes (Hot, Moderate, Cold)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
