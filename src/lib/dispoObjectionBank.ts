/**
 * Disposition Objection Bank
 * Centralized, categorized objections for buyer/investor training
 *
 * Categories:
 * - arv: ARV/valuation challenges
 * - repairs: Repair estimate disputes
 * - timeline: Close timeline objections
 * - emd: Earnest money deposit negotiations
 * - credibility: Trust and legitimacy questions
 * - competition: Scarcity and urgency challenges
 */

export type DispoObjectionCategory =
  | 'arv'
  | 'repairs'
  | 'timeline'
  | 'emd'
  | 'credibility'
  | 'competition';

export type ObjectionDifficulty = 'easy' | 'medium' | 'hard' | 'elite';

export type DispoGate = 1 | 2 | 3 | 4 | 5;

export interface DispoObjection {
  id: string;
  text: string;
  category: DispoObjectionCategory;
  difficulty: ObjectionDifficulty;
  triggerGate: DispoGate;
  context: string;
  suggestedRebuttal: string;
  coachingTip: string;
}

/**
 * Complete Dispo Objection Bank
 * 50+ objections across 6 categories
 */
export const DISPO_OBJECTIONS: DispoObjection[] = [
  // ============================================
  // ARV OBJECTIONS (Gate 2 - The Narrative)
  // ============================================
  {
    id: 'arv-001',
    text: "Your ARV seems high. I'm seeing comps at $20k less in this zip code.",
    category: 'arv',
    difficulty: 'medium',
    triggerGate: 2,
    context: 'When rep presents ARV without strong comp support',
    suggestedRebuttal:
      "I hear you. Let me walk you through the three comps I'm using - they're all within a quarter mile, sold in the last 90 days, and match our subject's bed/bath count. The one you might be seeing is [address] which was a distressed sale.",
    coachingTip:
      "Never defend a number without data. Always have 3 comps ready. If they challenge your ARV, go DEEPER into the comps, don't just repeat the number.",
  },
  {
    id: 'arv-002',
    text: "That ARV is inflated. I've been buying in this area for years and that's not realistic.",
    category: 'arv',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Experienced investor challenging local knowledge',
    suggestedRebuttal:
      "I respect your experience in the area. Let me share my sources - I pulled these from [MLS/PropStream/Privy] within the last 30 days. Are you seeing different data, or are we maybe looking at different property profiles?",
    coachingTip:
      "When they pull the 'experience card', don't back down. Acknowledge their expertise, then pivot to your DATA. Experience is subjective, data is objective.",
  },
  {
    id: 'arv-003',
    text: "The market has shifted. That ARV was valid 3 months ago, not today.",
    category: 'arv',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Market timing objection',
    suggestedRebuttal:
      "You're right that markets move fast. That's exactly why I pulled fresh comps this week. The most recent one closed [X days] ago at [price]. What are you seeing that suggests a downward trend?",
    coachingTip:
      "Market shift objections are often bluffs. Counter with RECENCY of your data. If your comps are 90+ days old, you've already lost this battle.",
  },
  {
    id: 'arv-004',
    text: "I need to run my own comps before I can take your ARV seriously.",
    category: 'arv',
    difficulty: 'medium',
    triggerGate: 2,
    context: 'Buyer wants to delay with their own research',
    suggestedRebuttal:
      "Absolutely, do your due diligence. I'll send you my comp sheet right now. But I should mention - I've got two other buyers running their numbers today. When can you have yours done? I want to give you first shot.",
    coachingTip:
      "This is a stall tactic 80% of the time. Send your comps immediately, then create urgency. 'When can you have yours done?' forces a commitment.",
  },
  {
    id: 'arv-005',
    text: "Your ARV assumes a full rehab. What if I just want to wholesale it?",
    category: 'arv',
    difficulty: 'easy',
    triggerGate: 2,
    context: 'Buyer has different exit strategy',
    suggestedRebuttal:
      "Smart question. The ARV I quoted is retail-ready. If you're planning to wholesale, you're looking at a spread of [X] on top of your buy-in. Either way, the numbers work - it just depends on your exit.",
    coachingTip:
      "Know your buyer's exit strategy BEFORE you pitch numbers. Ask early: 'Are you flipping this yourself or moving it to your network?'",
  },
  {
    id: 'arv-006',
    text: "I pulled Zillow and it shows $30k less than your ARV.",
    category: 'arv',
    difficulty: 'easy',
    triggerGate: 2,
    context: 'Buyer using unreliable source',
    suggestedRebuttal:
      "Zillow's a starting point, but their algorithm doesn't account for renovated condition. My ARV assumes a fully rehabbed property - new kitchen, baths, flooring. Want me to show you the renovated comps versus as-is comps side by side?",
    coachingTip:
      "Never trash Zillow directly - it makes you look defensive. Instead, EDUCATE on why your source is better: actual sold data vs. algorithm estimates.",
  },
  {
    id: 'arv-007',
    text: "That's a war zone. Your ARV doesn't reflect the crime rate in that area.",
    category: 'arv',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Neighborhood reputation objection',
    suggestedRebuttal:
      "I understand the concern. Here's what the data shows - these three properties in the same subdivision sold within the last 60 days at these prices. The buyers were investors just like you. The spread accounts for the area risk.",
    coachingTip:
      "Don't argue about crime stats. Pivot to ACTUAL SALES. If properties are selling at your ARV in that area, the market has already priced in the risk.",
  },
  {
    id: 'arv-008',
    text: "Your comps are all from the other side of the highway. This side is different.",
    category: 'arv',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Micro-market objection',
    suggestedRebuttal:
      "You know the area well. Let me pull up the specific comps on this side - I've got [X] within [radius]. You're right that there can be variations block by block. What price point would make sense to you based on your experience?",
    coachingTip:
      "This buyer knows the micro-market. Don't fight them - PARTNER with them. Ask what THEY think it's worth, then work backward to justify your spread.",
  },

  // ============================================
  // REPAIR OBJECTIONS (Gate 2 - The Narrative)
  // ============================================
  {
    id: 'repairs-001',
    text: "You said $25k in repairs? My contractor won't touch this for less than $50k.",
    category: 'repairs',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Buyer has higher repair estimate',
    suggestedRebuttal:
      "I appreciate you running your own numbers. My estimate is based on cosmetic rehab - paint, flooring, fixtures. If you're seeing $50k, you might be pricing in a full gut. What's your scope of work?",
    coachingTip:
      "Repair disputes are rarely about the TOTAL - they're about the SCOPE. Ask what they're including. Often they're pricing a Cadillac rehab when a Honda will do.",
  },
  {
    id: 'repairs-002',
    text: "This is a 1970s build. I'm looking at cast iron pipes and an original panel. Your numbers are off.",
    category: 'repairs',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Buyer flags hidden costs',
    suggestedRebuttal:
      "Good catch on the build year. Here's the thing - we priced the buy-in with room for that. You're getting in at [X], which leaves [Y] spread even if you re-pipe and upgrade the panel. Want me to walk through the math?",
    coachingTip:
      "When they find real issues, DON'T DISMISS THEM. Acknowledge, then show how your spread ALREADY accounts for it. 'That's why the buy-in is where it is.'",
  },
  {
    id: 'repairs-003',
    text: "Have you actually walked this property? These repair estimates seem like guesses.",
    category: 'repairs',
    difficulty: 'medium',
    triggerGate: 2,
    context: 'Credibility challenge on repairs',
    suggestedRebuttal:
      "Fair question. I've got [photos/inspection report/walkthrough notes] from our team. The estimate is based on [X]. If you want to walk it yourself before committing, I can set that up - but I need to know today if you're serious.",
    coachingTip:
      "If you haven't walked the property, be honest but confident. 'Our team inspected it' or 'Based on photos and disclosures.' Never lie about a walkthrough.",
  },
  {
    id: 'repairs-004',
    text: "You're not accounting for holding costs. By the time I rehab and sell, I'm underwater.",
    category: 'repairs',
    difficulty: 'medium',
    triggerGate: 2,
    context: 'Buyer factors in time costs',
    suggestedRebuttal:
      "Let's run the full picture. Buy-in at [X], rehab at [Y], holding for [Z months] at roughly [$/month]. That puts your all-in at [total]. With an ARV of [A], you're looking at [profit]. Where do you see it differently?",
    coachingTip:
      "Sophisticated buyers think about holding costs. If you can't run a full deal analysis including holding, you'll lose credibility fast. Know your numbers cold.",
  },
  {
    id: 'repairs-005',
    text: "I need a contractor to walk this before I commit to your repair number.",
    category: 'repairs',
    difficulty: 'easy',
    triggerGate: 2,
    context: 'Delay tactic via contractor',
    suggestedRebuttal:
      "Totally understand. When can your contractor get out there? I've got another buyer scheduling a walkthrough for [tomorrow/Friday]. If you can have eyes on it by then, I'll hold it for you.",
    coachingTip:
      "Contractor walkthrough requests are often stalls. Create urgency but accommodate. The key is getting a COMMITMENT on timing.",
  },
  {
    id: 'repairs-006',
    text: "Foundation issues aren't in your estimate. That's a $15k problem minimum.",
    category: 'repairs',
    difficulty: 'hard',
    triggerGate: 2,
    context: 'Major structural concern',
    suggestedRebuttal:
      "If there's foundation work needed, that's a game changer. Let me check our inspection notes... [pause]. I'm not seeing that flagged, but if you have intel I don't, let's factor it in. What makes you think foundation?",
    coachingTip:
      "Foundation claims need verification. Don't panic, but don't dismiss. Ask for THEIR source. Sometimes buyers throw this out as a negotiation tactic.",
  },
  {
    id: 'repairs-007',
    text: "Material costs are up 30% this year. Your repair estimate is using last year's prices.",
    category: 'repairs',
    difficulty: 'medium',
    triggerGate: 2,
    context: 'Inflation/supply chain objection',
    suggestedRebuttal:
      "You're right that material costs have increased. My estimate is from [date] using current pricing from [source]. But here's the thing - that $25k is conservative. Most of my buyers are coming in under that because they have crew relationships. What's your situation?",
    coachingTip:
      "Cost inflation is real. Acknowledge it, then pivot to THEIR resources. Investors with good contractor relationships can beat standard estimates.",
  },

  // ============================================
  // TIMELINE OBJECTIONS (Gate 4 - The Terms)
  // ============================================
  {
    id: 'timeline-001',
    text: "7 days is too fast. I need at least 21 days to close.",
    category: 'timeline',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Standard timeline pushback',
    suggestedRebuttal:
      "I hear you. What's driving the 21-day need - is it funding, due diligence, or scheduling? If it's just title work, our title company can usually clear in 10-14 days. Can we meet in the middle at 14?",
    coachingTip:
      "Never immediately agree to timeline extensions. PROBE for the reason. Often you can solve the underlying issue without extending the close.",
  },
  {
    id: 'timeline-002',
    text: "I don't sign assignments until my contractor walks the site. I'll get back to you in 3 days.",
    category: 'timeline',
    difficulty: 'hard',
    triggerGate: 4,
    context: 'Delay via contractor walkthrough',
    suggestedRebuttal:
      "I respect that process. Here's my concern - I've got two other buyers who are ready to move today. Can your contractor get out there in the next 24-48 hours? I want to give you first shot, but I can't hold it indefinitely.",
    coachingTip:
      "'I'll get back to you' is a buying objection, not a real timeline need. Create urgency with competing buyers, then offer a SHORT hold window.",
  },
  {
    id: 'timeline-003',
    text: "I need 30 days. My lender requires that for funding.",
    category: 'timeline',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Financing-driven timeline',
    suggestedRebuttal:
      "Got it - you're using financing. Here's the challenge: our seller needs to close quickly, which is why the price is where it is. Is this a deal you could do cash, or do you have a hard money source that can move faster?",
    coachingTip:
      "Lender timelines are often real constraints. Pivot to CASH or hard money options. If they can't close fast, they may not be the right buyer for this deal.",
  },
  {
    id: 'timeline-004',
    text: "What's the rush? If it's a good deal, it'll still be good in 3 weeks.",
    category: 'timeline',
    difficulty: 'easy',
    triggerGate: 4,
    context: "Buyer doesn't feel urgency",
    suggestedRebuttal:
      "Fair point. The rush is on my end, not the deal itself. I've got other buyers circling, and my seller is motivated to close this week. If you can move fast, you get the deal. If not, no hard feelings - I'll move to my next buyer.",
    coachingTip:
      "This buyer doesn't feel scarcity. Your job is to CREATE it. 'Other buyers circling' and 'seller motivated' both add pressure without being pushy.",
  },
  {
    id: 'timeline-005',
    text: "I've been burned before rushing into deals. I need time to do proper due diligence.",
    category: 'timeline',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Past bad experience',
    suggestedRebuttal:
      "I respect that - due diligence matters. What specifically do you need to verify? If it's title, we can get a prelim today. If it's inspection, we can schedule tomorrow. Let's figure out how to get you comfortable without losing the deal.",
    coachingTip:
      "When they mention being burned before, acknowledge it emotionally, then get SPECIFIC about what they need. Solve the real concern, not the symptom.",
  },
  {
    id: 'timeline-006',
    text: "14 days is my minimum. I've got other deals in the pipeline and I can't drop everything.",
    category: 'timeline',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Busy investor with multiple deals',
    suggestedRebuttal:
      "I get it - you're juggling multiple deals. Here's what I can do: 14 days to close, but I need your EMD today to lock it in. That shows me you're serious and gives you the timeline you need. Does that work?",
    coachingTip:
      "If you have to extend timeline, get something in return - EMD commitment, higher deposit, or verbal agreement on terms. Never give without getting.",
  },

  // ============================================
  // EMD OBJECTIONS (Gate 4 - The Terms)
  // ============================================
  {
    id: 'emd-001',
    text: "$5k EMD is too much. I'll do $2k non-refundable.",
    category: 'emd',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Standard EMD negotiation',
    suggestedRebuttal:
      "I understand $5k feels like a lot. Here's why we ask for it - it protects both of us. It shows you're serious, and it gives me confidence to take this off market. I can't go below $3k on this one. Can you make that work?",
    coachingTip:
      "$5k is the standard, $3k is the floor. Never go below $3k. Frame EMD as MUTUAL PROTECTION, not just a requirement.",
  },
  {
    id: 'emd-002',
    text: "I don't put up EMD until I see the property.",
    category: 'emd',
    difficulty: 'hard',
    triggerGate: 4,
    context: 'EMD contingent on walkthrough',
    suggestedRebuttal:
      "That's fair. Let's do this: we schedule a walkthrough for [tomorrow/48 hours], and you bring the EMD check with you. If you walk it and don't like what you see, we shake hands and part ways. Deal?",
    coachingTip:
      "Tie the walkthrough TO the EMD, not before it. 'Bring the check with you' creates commitment and filters out tire-kickers.",
  },
  {
    id: 'emd-003',
    text: "Make it refundable EMD and I'll move forward.",
    category: 'emd',
    difficulty: 'hard',
    triggerGate: 4,
    context: 'Buyer wants refundable deposit',
    suggestedRebuttal:
      "I can't do refundable on this one. Here's why: once you're under contract, I'm turning away other buyers. If you back out, I've lost time and opportunities. Non-refundable EMD keeps us both committed. Does the deal still work for you?",
    coachingTip:
      "NEVER agree to refundable EMD on assignments. It eliminates your leverage and invites flaky buyers. Hold firm - this is a non-negotiable.",
  },
  {
    id: 'emd-004',
    text: "What happens to my EMD if you can't close with the seller?",
    category: 'emd',
    difficulty: 'easy',
    triggerGate: 4,
    context: 'Risk concern about EMD',
    suggestedRebuttal:
      "Good question. If the deal falls through on OUR end - title issues, seller backs out - you get your EMD back. The non-refundable only applies if YOU back out. You're protected if we don't perform.",
    coachingTip:
      "This is a legitimate concern. Answer it directly and confidently. The buyer needs to know their EMD is safe if YOU fail to deliver.",
  },
  {
    id: 'emd-005',
    text: "I've got capital tied up in other deals. Can we do $1k EMD?",
    category: 'emd',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Cash flow constraint',
    suggestedRebuttal:
      "I hear you on cash flow. $1k is too light for us to take this off market - it doesn't show enough commitment. Can you do $3k? That's my floor, and it still gives you skin in the game without over-extending.",
    coachingTip:
      "$1k EMD signals a buyer who isn't serious or is spread too thin. Push for $3k minimum. If they can't do $3k, they probably can't close.",
  },
  {
    id: 'emd-006',
    text: "What's the EMD going toward? Is this your fee?",
    category: 'emd',
    difficulty: 'easy',
    triggerGate: 4,
    context: 'Confusion about EMD purpose',
    suggestedRebuttal:
      "The EMD goes into escrow with the title company - it's not my fee. It applies to your purchase price at closing. My fee is separate and built into the spread. The EMD just shows you're committed to closing.",
    coachingTip:
      "Educate clearly on EMD vs. assignment fee. Some buyers conflate the two. Clear this up early to avoid confusion at closing.",
  },
  {
    id: 'emd-007',
    text: "I'll wire the EMD after we sign the assignment.",
    category: 'emd',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Sequence negotiation',
    suggestedRebuttal:
      "I need the EMD before or at signing - that's what makes the assignment binding. Once I have your deposit, I'll send over the assignment and we execute together. Wire or cashier's check works - which is easier for you?",
    coachingTip:
      "EMD before or at signing, never after. 'After' means you have a signature but no commitment. Control the sequence.",
  },
  {
    id: 'emd-008',
    text: "$5k? I bought my last three deals with $500 EMD each.",
    category: 'emd',
    difficulty: 'medium',
    triggerGate: 4,
    context: 'Comparison to other deals',
    suggestedRebuttal:
      "Different deals, different terms. Those might have been direct-to-seller or different market conditions. For the spread you're getting here, $5k EMD is standard. It's less than 10% of your potential profit. Can you make it work?",
    coachingTip:
      "Don't let them anchor to past deals. Reframe around THIS deal's value and profit potential. '$5k is nothing compared to [profit].'",
  },

  // ============================================
  // CREDIBILITY OBJECTIONS (Gate 1 - The Hook)
  // ============================================
  {
    id: 'cred-001',
    text: "How many deals have you actually closed?",
    category: 'credibility',
    difficulty: 'medium',
    triggerGate: 1,
    context: 'Experience challenge',
    suggestedRebuttal:
      "This year, we've closed [X] transactions in this market. I can send you a few references if that helps. More importantly, let me show you why THIS deal makes sense for your portfolio.",
    coachingTip:
      "Answer directly with a number, then pivot to the deal. Don't over-explain or get defensive. Confidence is key.",
  },
  {
    id: 'cred-002',
    text: "Are you a licensed agent? Who do you work for?",
    category: 'credibility',
    difficulty: 'easy',
    triggerGate: 1,
    context: 'Licensing question',
    suggestedRebuttal:
      "I'm a real estate investor - we buy and sell properties directly. I work with [company name]. We're not agents, we're principals in the transaction. Does that answer your question?",
    coachingTip:
      "Be clear about your role. Wholesalers aren't agents. Don't misrepresent, but don't apologize either. Being a principal is a strength.",
  },
  {
    id: 'cred-003',
    text: "How do I know this isn't a scam?",
    category: 'credibility',
    difficulty: 'easy',
    triggerGate: 1,
    context: 'Trust concern',
    suggestedRebuttal:
      "Fair question - there are scammers out there. Here's how we do things: everything goes through a licensed title company, your EMD is held in escrow, and you can verify the property records yourself. Want me to send you our title company info?",
    coachingTip:
      "Address scam concerns with PROCESS transparency. Title company, escrow, public records - all verifiable. Offer to let them verify.",
  },
  {
    id: 'cred-004',
    text: "I've never heard of you or your company. Why should I trust you?",
    category: 'credibility',
    difficulty: 'medium',
    triggerGate: 1,
    context: 'Brand recognition concern',
    suggestedRebuttal:
      "We keep a low profile - most of our business comes from referrals and repeat buyers. I can connect you with a few investors we've closed with if that helps. But really, the deal speaks for itself - let me walk you through the numbers.",
    coachingTip:
      "Don't oversell your brand. Pivot to references and THE DEAL. Sophisticated buyers care about numbers, not marketing.",
  },
  {
    id: 'cred-005',
    text: "Send me your company website and reviews before we continue.",
    category: 'credibility',
    difficulty: 'easy',
    triggerGate: 1,
    context: 'Online verification request',
    suggestedRebuttal:
      "I'll send that over right now. While you're reviewing, can I ask - what are you looking for in a deal right now? Price point, area, property type? I want to make sure this one fits your criteria.",
    coachingTip:
      "Accommodate the request, but don't let the conversation stall. Keep them engaged while they verify. Ask qualifying questions.",
  },
  {
    id: 'cred-006',
    text: "Your numbers seem too good. What's the catch?",
    category: 'credibility',
    difficulty: 'medium',
    triggerGate: 1,
    context: 'Too-good-to-be-true suspicion',
    suggestedRebuttal:
      "No catch - just a motivated seller and good timing. We got this under contract because [reason]. The spread is real, which is why I'm calling my top buyers first. Do you want to see the comps?",
    coachingTip:
      "Explain WHY the deal is good without being defensive. Motivated sellers, quick close needs, estate sales - all create spread opportunities.",
  },

  // ============================================
  // COMPETITION OBJECTIONS (Gate 3 - Scarcity)
  // ============================================
  {
    id: 'comp-001',
    text: "Prove you actually have other buyers interested.",
    category: 'competition',
    difficulty: 'hard',
    triggerGate: 3,
    context: 'Scarcity skepticism',
    suggestedRebuttal:
      "I'm not going to share other buyers' names, but I can tell you I've got three calls scheduled after this one. One is a portfolio buyer who takes 5+ deals a month from us. If you want this one, I need a decision today.",
    coachingTip:
      "You can't 'prove' other buyers without violating confidentiality. Create credibility through SPECIFICITY: '3 calls', 'portfolio buyer', '5+ deals/month'.",
  },
  {
    id: 'comp-002',
    text: "Why should I rush? If they haven't bought it yet, maybe there's something wrong with it.",
    category: 'competition',
    difficulty: 'medium',
    triggerGate: 3,
    context: 'Reverse scarcity logic',
    suggestedRebuttal:
      "Good thinking. The reason it's still available is I just got it under contract [yesterday/this week]. I'm calling my A-list buyers first before I blast it out. You're getting first look, not the leftovers.",
    coachingTip:
      "Reframe 'still available' as 'just acquired'. The deal being fresh is a FEATURE, not a bug. First look = privilege.",
  },
  {
    id: 'comp-003',
    text: "I'll think about it and call you back tomorrow.",
    category: 'competition',
    difficulty: 'medium',
    triggerGate: 3,
    context: 'Classic delay tactic',
    suggestedRebuttal:
      "I understand you want to think it over. Here's my concern - I've got another buyer ready to move today. If you need until tomorrow, can you at least send me a soft commitment? That way I can hold it for 24 hours.",
    coachingTip:
      "'Think about it' is a polite no 70% of the time. Push for a soft commitment or a specific callback time. Vague delays kill deals.",
  },
  {
    id: 'comp-004',
    text: "I'm not going to compete in a bidding war.",
    category: 'competition',
    difficulty: 'medium',
    triggerGate: 3,
    context: 'Anti-competition stance',
    suggestedRebuttal:
      "This isn't a bidding war - the price is set. It's first-come, first-served. If you're in at [price] with EMD today, it's yours. If not, I move to the next buyer. No auctions, no games.",
    coachingTip:
      "Clarify that scarcity doesn't mean bidding. You're not raising the price, you're just moving fast. First buyer wins, not highest bidder.",
  },
  {
    id: 'comp-005',
    text: "You're just saying there are other buyers to pressure me.",
    category: 'competition',
    difficulty: 'hard',
    triggerGate: 3,
    context: 'Calling your bluff',
    suggestedRebuttal:
      "I get why you'd think that - some people do play games. I don't. If there were no other buyers, I'd tell you and we'd take our time. The reality is this deal fits multiple buyers' criteria. I'm being straight with you.",
    coachingTip:
      "When they call your bluff, don't get defensive. Be direct: 'I'm being straight with you.' Authenticity beats pressure tactics.",
  },
  {
    id: 'comp-006',
    text: "Let me know when your other buyers fall through.",
    category: 'competition',
    difficulty: 'medium',
    triggerGate: 3,
    context: 'Waiting for second chance',
    suggestedRebuttal:
      "I appreciate the interest, but that's not how I work. When a deal goes, it goes. I'd rather have you as my buyer on THIS deal than waiting for leftovers. What would it take to get you to move today?",
    coachingTip:
      "Don't encourage backup buyer mentality. Reframe them as a PRIMARY buyer. 'What would it take to move today?' creates urgency.",
  },
  {
    id: 'comp-007',
    text: "If it's such a great deal, why are you selling it instead of keeping it?",
    category: 'competition',
    difficulty: 'medium',
    triggerGate: 3,
    context: 'Questioning your motive',
    suggestedRebuttal:
      "Great question. My business model is volume - I find deals and pass them to buyers like you. I make my money on the assignment fee. I don't have the capital or crew to flip 20+ deals a month myself. That's where you come in.",
    coachingTip:
      "Be transparent about your business model. Wholesaling isn't a secret. Buyers respect honesty about why you're selling vs. keeping.",
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all objections for a specific category
 */
export function getDispoObjectionsByCategory(
  category: DispoObjectionCategory
): DispoObjection[] {
  return DISPO_OBJECTIONS.filter((obj) => obj.category === category);
}

/**
 * Get all objections for a specific gate
 */
export function getDispoObjectionsByGate(gate: DispoGate): DispoObjection[] {
  return DISPO_OBJECTIONS.filter((obj) => obj.triggerGate === gate);
}

/**
 * Get all objections for a specific difficulty level
 */
export function getDispoObjectionsByDifficulty(
  difficulty: ObjectionDifficulty
): DispoObjection[] {
  return DISPO_OBJECTIONS.filter((obj) => obj.difficulty === difficulty);
}

/**
 * Get objections filtered by multiple criteria
 */
export function getDispoObjectionsFiltered(filters: {
  category?: DispoObjectionCategory;
  gate?: DispoGate;
  difficulty?: ObjectionDifficulty;
}): DispoObjection[] {
  return DISPO_OBJECTIONS.filter((obj) => {
    if (filters.category && obj.category !== filters.category) return false;
    if (filters.gate && obj.triggerGate !== filters.gate) return false;
    if (filters.difficulty && obj.difficulty !== filters.difficulty) return false;
    return true;
  });
}

/**
 * Get a random objection with optional filters
 */
export function getRandomDispoObjection(filters?: {
  category?: DispoObjectionCategory;
  gate?: DispoGate;
  difficulty?: ObjectionDifficulty;
}): DispoObjection | null {
  const filtered = filters
    ? getDispoObjectionsFiltered(filters)
    : DISPO_OBJECTIONS;

  if (filtered.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}

/**
 * Get multiple random objections (non-repeating)
 */
export function getRandomDispoObjections(
  count: number,
  filters?: {
    category?: DispoObjectionCategory;
    gate?: DispoGate;
    difficulty?: ObjectionDifficulty;
  }
): DispoObjection[] {
  const filtered = filters
    ? getDispoObjectionsFiltered(filters)
    : [...DISPO_OBJECTIONS];

  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get coaching info for a specific objection
 */
export function getCoachingForObjection(objectionId: string): {
  suggestedRebuttal: string;
  coachingTip: string;
} | null {
  const objection = DISPO_OBJECTIONS.find((obj) => obj.id === objectionId);
  if (!objection) return null;

  return {
    suggestedRebuttal: objection.suggestedRebuttal,
    coachingTip: objection.coachingTip,
  };
}

/**
 * Get objections formatted for persona injection
 */
export function getObjectionsForPersonaPrompt(
  difficulty: ObjectionDifficulty,
  categories?: DispoObjectionCategory[]
): string {
  const difficultyMap: Record<ObjectionDifficulty, ObjectionDifficulty[]> = {
    easy: ['easy'],
    medium: ['easy', 'medium'],
    hard: ['easy', 'medium', 'hard'],
    elite: ['easy', 'medium', 'hard', 'elite'],
  };

  const allowedDifficulties = difficultyMap[difficulty];
  const targetCategories = categories || [
    'arv',
    'repairs',
    'timeline',
    'emd',
    'credibility',
    'competition',
  ];

  const objections = DISPO_OBJECTIONS.filter(
    (obj) =>
      allowedDifficulties.includes(obj.difficulty) &&
      targetCategories.includes(obj.category)
  );

  // Format for prompt injection
  const byCategory: Record<string, string[]> = {};
  for (const obj of objections) {
    if (!byCategory[obj.category]) {
      byCategory[obj.category] = [];
    }
    byCategory[obj.category].push(`"${obj.text}"`);
  }

  let prompt = 'USE THESE OBJECTIONS BASED ON CONTEXT:\n\n';
  for (const [category, texts] of Object.entries(byCategory)) {
    prompt += `${category.toUpperCase()} OBJECTIONS:\n`;
    prompt += texts.slice(0, 3).join('\n') + '\n\n';
  }

  return prompt;
}

/**
 * Get summary stats for the objection bank
 */
export function getObjectionBankStats(): {
  total: number;
  byCategory: Record<DispoObjectionCategory, number>;
  byDifficulty: Record<ObjectionDifficulty, number>;
  byGate: Record<number, number>;
} {
  const byCategory: Record<DispoObjectionCategory, number> = {
    arv: 0,
    repairs: 0,
    timeline: 0,
    emd: 0,
    credibility: 0,
    competition: 0,
  };

  const byDifficulty: Record<ObjectionDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    elite: 0,
  };

  const byGate: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const obj of DISPO_OBJECTIONS) {
    byCategory[obj.category]++;
    byDifficulty[obj.difficulty]++;
    byGate[obj.triggerGate]++;
  }

  return {
    total: DISPO_OBJECTIONS.length,
    byCategory,
    byDifficulty,
    byGate,
  };
}
