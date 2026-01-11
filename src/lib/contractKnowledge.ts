/**
 * Contract Knowledge Base
 * Contains Purchase Agreement (PA) details and plain English explanations
 * for the Contract Walk-Through module
 */

export interface ContractClause {
  clauseNumber: string;
  title: string;
  legalText: string;
  plainEnglish: string;
  confirmationQuestion?: string;
  keyPoints: string[];
}

export interface ContractDetails {
  purchasePrice: {
    total: number;
    earnestMoney: number;
    cashAtClose: number;
  };
  closingCosts: {
    coveredByBuyer: boolean;
    explanation: string;
  };
  asIsCondition: {
    includesFixtures: boolean;
    explanation: string;
  };
  clauses: ContractClause[];
}

/**
 * Get the complete contract knowledge base
 */
export function getContractKnowledge(): ContractDetails {
  return {
    purchasePrice: {
      total: 82700.00,
      earnestMoney: 100.00,
      cashAtClose: 82600.00,
    },
    closingCosts: {
      coveredByBuyer: true,
      explanation: "All closing costs are covered by us. You won't pay anything out of pocket at closing.",
    },
    asIsCondition: {
      includesFixtures: true,
      explanation: "The property is being bought in AS IS Condition, including all fixtures like ceiling fans and window coverings. This means we're accepting the property exactly as it is, and you don't need to make any repairs or changes.",
    },
    clauses: [
      {
        clauseNumber: "10",
        title: "Title Delays",
        legalText: "If title cannot be made merchantable within the time specified, this contract may be terminated...",
        plainEnglish: "If there's something 'clouding the title'—like an old lien or paperwork issue—it doesn't mean we don't want the home. It just means we'll work together with the title company to clear it up. We're committed to making this work.",
        confirmationQuestion: "Does that make sense? Do you have any questions on how the title company handles that?",
        keyPoints: [
          "Title issues don't mean we're backing out",
          "We'll work together to resolve any problems",
          "Title company handles the research and clearing",
        ],
      },
      {
        clauseNumber: "12c",
        title: "Personal Property",
        legalText: "All personal property left on premises becomes property of buyer...",
        plainEnglish: "If you leave a dresser in the back room, or any other personal items, they become ours—you can't come back for them later. So make sure you take everything you want to keep before closing.",
        confirmationQuestion: "Does that make sense? Do you have any questions about what stays and what goes?",
        keyPoints: [
          "Personal items left behind become buyer's property",
          "Seller should remove all items they want to keep",
          "Fixtures (ceiling fans, window coverings) stay with the property",
        ],
      },
      {
        clauseNumber: "16",
        title: "Marketing",
        legalText: "Buyer may assign this contract or market the property to financial partners...",
        plainEnglish: "Our financial partners—the people who will provide the funds for this purchase—may come out during the inspection period to look at the property. This is normal and helps us move forward with the purchase.",
        confirmationQuestion: "Does that make sense? Any concerns about our partners viewing the property?",
        keyPoints: [
          "Financial partners provide the purchase funds",
          "They may visit during inspection period",
          "This is standard practice for direct buyers",
        ],
      },
      {
        clauseNumber: "Tax Proration",
        title: "Tax Proration",
        legalText: "Property taxes will be prorated as of the closing date...",
        plainEnglish: "Property taxes are split based on the closing date. You'll pay for the portion of the year you owned the property, and we'll pay for the rest. The title company calculates this automatically.",
        confirmationQuestion: "Does that make sense? Do you have any questions about how the tax proration works?",
        keyPoints: [
          "Taxes split based on closing date",
          "Title company handles the calculation",
          "Seller pays for time they owned, buyer pays for remainder",
        ],
      },
      {
        clauseNumber: "Encumbrances",
        title: "Encumbrances",
        legalText: "Property is sold subject to existing encumbrances...",
        plainEnglish: "Any existing liens, easements, or other claims on the property will remain. The title company will research these and make sure everything is properly documented.",
        confirmationQuestion: "Does that make sense? Do you have any questions about how encumbrances are handled?",
        keyPoints: [
          "Existing liens and easements stay with the property",
          "Title company researches and documents everything",
          "All encumbrances are disclosed in title report",
        ],
      },
      {
        clauseNumber: "17",
        title: "Memorandum of Contract",
        legalText: "Buyer may file a Memorandum of Contract with the county recorder's office...",
        plainEnglish: "This is like a 'Reservation Sign' that notifies the county we're working together on this deal. It protects both of us by ensuring no other buyer can 'snake' the deal while we're in escrow. It's mutual protection—not a lien on your property.",
        confirmationQuestion: "Does that make sense? It's really just a notice to the county that we have an agreement in place.",
        keyPoints: [
          "Notifies county of our agreement",
          "Prevents other buyers from interfering",
          "Mutual protection for both parties",
          "Not a lien—just a notice of agreement",
          "Protects seller during escrow period",
        ],
        objectionTrigger: true,
        objectionText: "Wait, notify the county? This sounds like you're putting a lien on my house. I don't want anything recorded against my property until the money is in my hand.",
        skepticismLevels: {
          level1: {
            trigger: ["mutual protection", "protects both", "reservation sign", "prevents other buyers", "snake the deal"],
            response: "Okay, I understand. It's just a notice, not a lien. That makes sense.",
          },
          level2: {
            trigger: ["vague", "unclear", "not sure", "confused", "don't understand"],
            objection: "My cousin told me never to sign a memorandum. It clouds the title. Why can't we just skip this part?",
          },
        },
        correctResponse: "That's a valid concern. Let me put you on a quick hold and see if my underwriters can explain the specific county filing we use to keep both of us safe.",
        objectionTip: "Tip: Explain Clause 17 as a 'Reservation Sign' that prevents title delays and protects both parties during escrow.",
      },
    ],
  };
}

/**
 * Get a specific clause by number or title
 */
export function getContractClause(identifier: string): ContractClause | null {
  const knowledge = getContractKnowledge();
  return (
    knowledge.clauses.find(
      (clause) =>
        clause.clauseNumber.toLowerCase() === identifier.toLowerCase() ||
        clause.title.toLowerCase() === identifier.toLowerCase()
    ) || null
  );
}

/**
 * Get the purchase price summary in plain English
 */
export function getPurchasePriceSummary(): string {
  const { purchasePrice } = getContractKnowledge();
  return `Here's the breakdown of the purchase price:
- Total Purchase Price: $${purchasePrice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Earnest Money: $${purchasePrice.earnestMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Cash at Close: $${purchasePrice.cashAtClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

The earnest money shows our commitment to the purchase, and the cash at close is what you'll receive on closing day.`;
}

/**
 * Get the closing costs explanation
 */
export function getClosingCostsExplanation(): string {
  const { closingCosts } = getContractKnowledge();
  return closingCosts.explanation;
}

/**
 * Get the AS-IS condition explanation
 */
export function getAsIsExplanation(): string {
  const { asIsCondition } = getContractKnowledge();
  return asIsCondition.explanation;
}

/**
 * Generate contract walk-through prompt for AI
 */
export function getContractWalkthroughPrompt(): string {
  const knowledge = getContractKnowledge();
  
  return `CONTRACT WALK-THROUGH MODULE - Purchase Agreement Explanation:

You are guiding the seller through their Purchase Agreement (PA) for Real Estate. Your goal is to build trust by explaining complex legal language in plain English.

KEY DETAILS TO REMEMBER:
1. **Purchase Price:**
   - Total Price: $${knowledge.purchasePrice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
   - Earnest Money: $${knowledge.purchasePrice.earnestMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
   - Cash at Close: $${knowledge.purchasePrice.cashAtClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

2. **Closing Costs:** ${knowledge.closingCosts.explanation}

3. **AS-IS Condition:** ${knowledge.asIsCondition.explanation}

4. **Authority Reminder:** We are direct buyers, not realtors. We're purchasing the property directly from you.

BEHAVIORAL INTERACTION RULES:
- After explaining each clause, ask: "Does that make sense?" or "Do you have any questions about [specific topic]?"
- Use confirmation loops to ensure understanding
- Remind the seller periodically that we are "direct buyers" to build trust
- Speak in a warm, reassuring tone—you're helping them understand, not intimidating them

PLAIN ENGLISH TRANSLATIONS:
${knowledge.clauses.map(clause => `
**Clause ${clause.clauseNumber} - ${clause.title}:**
${clause.plainEnglish}
${clause.confirmationQuestion ? `After explaining, ask: "${clause.confirmationQuestion}"` : ''}
`).join('\n')}

When walking through the contract:
1. Start with the purchase price breakdown
2. Explain closing costs (all covered by us)
3. Cover AS-IS condition
4. Go through each clause in order, using the plain English explanations above
5. After each section, use a confirmation loop
6. Remind them we're direct buyers (not realtors) when appropriate

Your tone should be: Helpful, patient, reassuring, and transparent. You're building trust by making complex legal language understandable.`;
}
