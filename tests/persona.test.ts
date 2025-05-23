import { create as createTrait, Trait } from '../src/items/trait';
import { create as createInstruction, Instruction } from '../src/items/instruction';
import { create as createSection, Section } from '../src/items/section';
import { describe, expect, it, beforeEach } from 'vitest';

// Define Persona type based on the section approach
type Persona = {
    name: string,
    traits: Section<Trait>,
    instructions: Section<Instruction>
};

describe('Persona', () => {
    let persona: Persona;
    const personaName = 'Test Persona';

    beforeEach(() => {
        // Initialize persona with empty sections before each test
        const traitsSection = createSection<Trait>({ title: 'Traits' });
        const instructionsSection = createSection<Instruction>({ title: 'Instructions' });

        // Create persona section and add subsections
        const personaSection = createSection({ title: 'Persona' });
        personaSection.add(traitsSection);
        personaSection.add(instructionsSection);

        // Create persona object
        persona = {
            name: personaName,
            traits: traitsSection,
            instructions: instructionsSection
        };
    });

    it('should create a persona with the correct name', () => {
        expect(persona.name).toBe(personaName);
        expect(persona.traits.items).toEqual([]);
        expect(persona.instructions.items).toEqual([]);
    });

    describe('traits', () => {
        it('should store traits in a section', () => {
            const trait: Trait = createTrait('Test Trait');
            const traitsSection = createSection<Trait>({ title: 'Traits' });
            traitsSection.add(trait);
            const instructionsSection = createSection<Instruction>({ title: 'Instructions' });

            // Create persona object
            const testPersona: Persona = {
                name: personaName,
                traits: traitsSection,
                instructions: instructionsSection
            };

            expect(testPersona.traits.items).toHaveLength(1);
            expect(testPersona.traits.items[0]).toBe(trait);
        });

        it('should access traits from the section', () => {
            const traitText = 'Test Trait from String';
            const traitsSection = createSection<Trait>({ title: 'Traits' });
            traitsSection.add(traitText);
            const instructionsSection = createSection<Instruction>({ title: 'Instructions' });

            // Create persona object
            const testPersona: Persona = {
                name: personaName,
                traits: traitsSection,
                instructions: instructionsSection
            };

            expect(testPersona.traits.items).toHaveLength(1);
            expect((testPersona.traits.items[0] as Trait).text).toBe(traitText);
        });
    });

    describe('instructions', () => {
        it('should store instructions in a section', () => {
            const instruction: Instruction = createInstruction('Test Instruction');
            const traitsSection = createSection<Trait>({ title: 'Traits' });
            const instructionsSection = createSection<Instruction>({ title: 'Instructions' });
            instructionsSection.add(instruction);

            // Create persona object
            const testPersona: Persona = {
                name: personaName,
                traits: traitsSection,
                instructions: instructionsSection
            };

            expect(testPersona.instructions.items).toHaveLength(1);
            expect(testPersona.instructions.items[0]).toBe(instruction);
        });

        it('should access instructions from the section', () => {
            const instructionText = 'Test Instruction from String';
            const traitsSection = createSection<Trait>({ title: 'Traits' });
            const instructionsSection = createSection<Instruction>({ title: 'Instructions' });
            instructionsSection.add(instructionText);

            // Create persona object
            const testPersona: Persona = {
                name: personaName,
                traits: traitsSection,
                instructions: instructionsSection
            };

            expect(testPersona.instructions.items).toHaveLength(1);
            expect((testPersona.instructions.items[0] as Instruction).text).toBe(instructionText);
        });
    });

    it('should maintain separate sections for traits and instructions', () => {
        const traitsSection = createSection<Trait>({ title: 'Traits' });
        traitsSection.add('Trait 1');
        traitsSection.add('Trait 2');

        const instructionsSection = createSection<Instruction>({ title: 'Instructions' });
        instructionsSection.add('Instruction 1');
        instructionsSection.add('Instruction 2');
        instructionsSection.add('Instruction 3');

        // Create persona object
        const testPersona: Persona = {
            name: personaName,
            traits: traitsSection,
            instructions: instructionsSection
        };

        expect(testPersona.traits.items).toHaveLength(2);
        expect(testPersona.instructions.items).toHaveLength(3);
        expect((testPersona.traits.items[0] as Trait).text).toBe('Trait 1');
        expect((testPersona.traits.items[1] as Trait).text).toBe('Trait 2');
        expect((testPersona.instructions.items[0] as Instruction).text).toBe('Instruction 1');
        expect((testPersona.instructions.items[1] as Instruction).text).toBe('Instruction 2');
        expect((testPersona.instructions.items[2] as Instruction).text).toBe('Instruction 3');
    });
});
