/**
 * Get Call Result API
 * Fetches a specific call result by ID
 * Triggers grading if goat_score is missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { judgeCall } from '@/lib/judge';
import { analyzeDeviation } from '@/lib/analyzeDeviation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;

    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (error) {
      console.error('Error fetching call:', error);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // If goat_score is missing, trigger grading
    if (!data.goat_score && data.transcript) {
      
      try {
        const gradingResult = await judgeCall(data.transcript);
        
        // Analyze script deviation if not already present
        let deviationAnalysis = data.script_adherence;
        if (!deviationAnalysis && data.transcript) {
          deviationAnalysis = await analyzeDeviation(data.transcript);
        }

        // Calculate logic gates array
        const logicGates = [
          {
            name: 'Approval/Denial Intro',
            passed: gradingResult.logicGates.intro === 'pass',
          },
          {
            name: 'Fact-Finding (The Why)',
            passed: gradingResult.logicGates.why === 'found',
          },
          {
            name: 'Property Condition (The House)',
            passed: gradingResult.logicGates.propertyCondition === 'pass',
          },
          {
            name: 'Tone',
            passed: gradingResult.logicGates.tone >= 7,
            score: gradingResult.logicGates.tone,
          },
          {
            name: 'The Clinch',
            passed: gradingResult.logicGates.clinch === 'pass',
          },
        ];

        // Update the call record
        const { error: updateError } = await supabaseAdmin
          .from('calls')
          .update({
            goat_score: gradingResult.goatScore,
            rebuttal_of_the_day: gradingResult.rebuttalOfTheDay,
            logic_gates: logicGates,
            feedback: gradingResult.feedback,
            script_adherence: deviationAnalysis, // Update script adherence
          })
          .eq('id', callId);

        if (updateError) {
          console.error('Error updating call with grade:', updateError);
        } else {
          // Update data object with new values
          data.goat_score = gradingResult.goatScore;
          data.rebuttal_of_the_day = gradingResult.rebuttalOfTheDay;
          data.logic_gates = logicGates;
          data.feedback = gradingResult.feedback;
          data.script_adherence = deviationAnalysis; // Store deviation analysis
        }
      } catch (gradingError) {
        console.error('Error grading call:', gradingError);
        // Continue with existing data even if grading fails
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/calls/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
