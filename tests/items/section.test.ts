/**
 * @vitest-environment node
 */
import { vi, describe, expect, it, beforeEach } from 'vitest';
import { SectionOptions, type Section } from '../../src/items/section';
import type { Weighted } from '../../src/items/weighted';

// Import the module under test - needs to be dynamic import with unstable_mockModule
let create: <T extends Weighted>(options?: Partial<SectionOptions>) => Section<T>;
let weightedModule: typeof import('../../src/items/weighted');
let sectionModule: typeof import('../../src/items/section');

describe('section', () => {
    beforeEach(async () => {
        // Import the modules under test dynamically after mocking
        sectionModule = await import('../../src/items/section');
        weightedModule = await import('../../src/items/weighted');
        create = sectionModule.create;
    });

    describe('create', () => {
        it('should create a section with the given title', () => {
            // Arrange
            const title = 'Test Section';

            // Act
            const section = create<Weighted>({ title });

            // Assert
            expect(section.title).toBe(title);
            expect(section.items).toEqual([]);
        });

        it('should have an add method', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Assert
            expect(typeof section.add).toBe('function');
        });
    });

    describe('add', () => {
        it('should add an item to the section', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });
            const item: Weighted = { text: 'Test Item' };

            // Act
            section.add(item);

            // Assert
            expect(section.items).toContain(item);
        });

        it('should add a section to the section', () => {
            // Arrange
            const parent = create<Weighted>({ title: 'Parent Section' });
            const child = create<Weighted>({ title: 'Child Section' });

            // Act
            parent.add(child);

            // Assert
            expect(parent.items).toContain(child);
        });

        it('should return the section for chaining', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Act
            const result = section.add('Item 1');

            // Assert
            expect(result).toBe(section);
        });

        it('should support chained calls', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Act
            section.add('Item 1');
            section.add('Item 2');
            section.add('Item 3');

            // Assert
            expect(section.items.length).toBe(3);
        });
    });

    describe('weights', () => {
        it('should create a section with the given weight', () => {
            // Arrange
            const title = 'Weighted Section';
            const weight = 10;

            // Act
            const section = create<Weighted>({ title, weight });

            // Assert
            expect(section.weight).toBe(weight);
        });

        it('should pass section weight to createWeighted when adding a string item', () => {
            // Arrange
            const sectionTitle = 'Parent Section';
            const itemWeight = 5;
            const section = create<Weighted>({ title: sectionTitle, itemWeight });
            const itemText = 'Test Item';

            // Act
            section.add(itemText);

            // Assert
            const addedItem = section.items[0] as Weighted;
            expect(section.weight).toBeUndefined();
            expect(addedItem.weight).toBe(itemWeight);
        });

        it('should preserve explicit item weight when adding a Weighted item to a weighted section', () => {
            // Arrange
            const sectionWeight = 5;
            const section = create<Weighted>({ title: 'Weighted Section', weight: sectionWeight });
            const itemWeight = 10;
            const item: Weighted = { text: 'Explicit Weight Item', weight: itemWeight };

            // Act
            section.add(item);

            // Assert
            const addedItem = section.items[0] as Weighted;
            expect(addedItem.weight).toBe(itemWeight);
        });

        it('should preserve explicit child section weight when adding to a weighted parent section', () => {
            // Arrange
            const parentWeight = 5;
            const parent = create<Weighted>({ title: 'Parent Section', weight: parentWeight });
            const childWeight = 10;
            const child = create<Weighted>({ title: 'Child Section', weight: childWeight });

            // Act
            parent.add(child);

            // Assert
            const addedChild = parent.items[0] as Section<Weighted>; // Assuming child is a Section
            expect(addedChild.weight).toBe(childWeight);
        });
    });

    describe('isSection', () => {
        it('should return true for a valid section object', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Act
            const result = sectionModule.isSection(section);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for a non-section object', () => {
            // Arrange
            const notASection = { title: 'Not a Section' }; // Missing 'items'

            // Act
            const result = sectionModule.isSection(notASection);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for null', () => {
            // Act
            const result = sectionModule.isSection(null);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for undefined', () => {
            // Act
            const result = sectionModule.isSection(undefined);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for a primitive type', () => {
            // Act
            const result = sectionModule.isSection('a string');

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('convertToSection', () => {
        it('should convert a valid section-like object to a Section', () => {
            // Arrange
            const sectionLike = {
                title: 'Test Section',
                items: [{ text: 'Item 1' }, { text: 'Item 2' }],
            };
            const options: Partial<SectionOptions> = { itemWeight: 2 };

            // Act
            const section = sectionModule.convertToSection(sectionLike, options);

            // Assert
            expect(sectionModule.isSection(section)).toBe(true);
            expect(section.title).toBe(sectionLike.title);
            expect(section.items.length).toBe(2);
            expect((section.items[0] as Weighted).text).toBe('Item 1');
            expect((section.items[0] as Weighted).weight).toBe(2); // from options.itemWeight
            expect((section.items[1] as Weighted).text).toBe('Item 2');
            expect((section.items[1] as Weighted).weight).toBe(2);
        });

        it('should convert a section-like object with nested sections', () => {
            // Arrange
            const nestedSectionLike = {
                title: 'Nested Section',
                items: [{ text: 'Nested Item' }],
            };
            const sectionLike = {
                title: 'Parent Section',
                items: [{ text: 'Item 1' }, nestedSectionLike],
            };
            const options: Partial<SectionOptions> = { itemWeight: 3 };


            // Act
            const section = sectionModule.convertToSection(sectionLike, options);

            // Assert
            expect(sectionModule.isSection(section)).toBe(true);
            expect(section.title).toBe(sectionLike.title);
            expect(section.items.length).toBe(2);
            expect((section.items[0] as Weighted).text).toBe('Item 1');
            expect((section.items[0] as Weighted).weight).toBe(3);

            const nestedSection = section.items[1] as Section<Weighted>;
            expect(sectionModule.isSection(nestedSection)).toBe(true);
            expect(nestedSection.title).toBe(nestedSectionLike.title);
            expect(nestedSection.items.length).toBe(1);
            expect((nestedSection.items[0] as Weighted).text).toBe('Nested Item');
            expect((nestedSection.items[0] as Weighted).weight).toBe(3); // itemWeight should propagate
        });

        it('should use default itemWeight if not provided in options for convertToSection', () => {
            // Arrange
            const sectionLike = {
                title: 'Test Section',
                items: [{ text: 'Item 1' }],
            };

            // Act
            const section = sectionModule.convertToSection(sectionLike); // No options

            // Assert
            expect((section.items[0] as Weighted).weight).toBeUndefined();
        });

        it('should throw an error if the object is not a section', () => {
            // Arrange
            const notASection = { title: 'Not a Section' }; // Missing 'items'

            // Act & Assert
            expect(() => sectionModule.convertToSection(notASection)).toThrow('Object is not a section');
        });

        it('should use options for the created section itself', () => {
            // Arrange
            const sectionLike = {
                title: 'Test Section',
                items: [],
            };
            const options: Partial<SectionOptions> = { weight: 5 };

            // Act
            const section = sectionModule.convertToSection(sectionLike, options);

            // Assert
            expect(section.weight).toBe(5);
        });
    });

    describe('append', () => {
        it('should append an item to the end of the section', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Initial Item');
            const newItem = { text: 'Appended Item' };

            // Act
            section.append(newItem);

            // Assert
            expect(section.items.length).toBe(2);
            expect(section.items[1]).toBe(newItem);
        });

        it('should append a string item, converting it to Weighted with section default itemWeight', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 });
            const newItemText = 'Appended String Item';

            // Act
            section.append(newItemText);

            // Assert
            expect(section.items.length).toBe(1);
            const appendedItem = section.items[0] as Weighted;
            expect(appendedItem.text).toBe(newItemText);
            expect(appendedItem.weight).toBe(3);
        });

        it('should append a string item with explicit options', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 });
            const newItemText = 'Appended String Item';

            // Act
            section.append(newItemText, { weight: 5 });

            // Assert
            expect(section.items.length).toBe(1);
            const appendedItem = section.items[0] as Weighted;
            expect(appendedItem.text).toBe(newItemText);
            expect(appendedItem.weight).toBe(5); // Explicit option overrides section default
        });

        it('should return the section for chaining', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Act
            const result = section.append('Item 1');

            // Assert
            expect(result).toBe(section);
        });
    });

    describe('prepend', () => {
        it('should prepend an item to the beginning of the section', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Initial Item');
            const newItem = { text: 'Prepended Item' };

            // Act
            section.prepend(newItem);

            // Assert
            expect(section.items.length).toBe(2);
            expect(section.items[0]).toBe(newItem);
        });

        it('should prepend a string item, converting it to Weighted with section default itemWeight', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 });
            const newItemText = 'Prepended String Item';

            // Act
            section.prepend(newItemText);

            // Assert
            expect(section.items.length).toBe(1);
            const prependedItem = section.items[0] as Weighted;
            expect(prependedItem.text).toBe(newItemText);
            expect(prependedItem.weight).toBe(3);
        });

        it('should prepend a string item with explicit options', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 });
            const newItemText = 'Prepended String Item';

            // Act
            section.prepend(newItemText, { weight: 5 });

            // Assert
            expect(section.items.length).toBe(1);
            const prependedItem = section.items[0] as Weighted;
            expect(prependedItem.text).toBe(newItemText);
            expect(prependedItem.weight).toBe(5); // Explicit option overrides section default
        });

        it('should return the section for chaining', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Act
            const result = section.prepend('Item 1');

            // Assert
            expect(result).toBe(section);
        });
    });

    describe('insert', () => {
        it('should insert an item at the specified index', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Item 0').add('Item 2');
            const newItem = { text: 'Inserted Item' };

            // Act
            section.insert(1, newItem);

            // Assert
            expect(section.items.length).toBe(3);
            expect(section.items[1]).toBe(newItem);
            expect((section.items[0] as Weighted).text).toBe('Item 0');
            expect((section.items[2] as Weighted).text).toBe('Item 2');
        });

        it('should insert a string item, converting it to Weighted with section default itemWeight', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 }).add('Item 0').add('Item 2');
            const newItemText = 'Inserted String Item';

            // Act
            section.insert(1, newItemText);

            // Assert
            expect(section.items.length).toBe(3);
            const insertedItem = section.items[1] as Weighted;
            expect(insertedItem.text).toBe(newItemText);
            expect(insertedItem.weight).toBe(3);
        });

        it('should insert a string item with explicit options', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 }).add('Item 0').add('Item 2');
            const newItemText = 'Inserted String Item';

            // Act
            section.insert(1, newItemText, { weight: 7 });

            // Assert
            expect(section.items.length).toBe(3);
            const insertedItem = section.items[1] as Weighted;
            expect(insertedItem.text).toBe(newItemText);
            expect(insertedItem.weight).toBe(7);
        });

        it('should return the section for chaining', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' });

            // Act
            const result = section.insert(0, 'Item 1');

            // Assert
            expect(result).toBe(section);
        });
    });

    describe('remove', () => {
        it('should remove an item at the specified index', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Item 0').add('Item 1').add('Item 2');

            // Act
            section.remove(1);

            // Assert
            expect(section.items.length).toBe(2);
            expect((section.items[0] as Weighted).text).toBe('Item 0');
            expect((section.items[1] as Weighted).text).toBe('Item 2');
        });

        it('should return the section for chaining', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Item 0');

            // Act
            const result = section.remove(0);

            // Assert
            expect(result).toBe(section);
        });
    });

    describe('replace', () => {
        it('should replace an item at the specified index', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Item 0').add('Old Item').add('Item 2');
            const newItem = { text: 'Replaced Item' };

            // Act
            section.replace(1, newItem);

            // Assert
            expect(section.items.length).toBe(3);
            expect(section.items[1]).toBe(newItem);
        });

        it('should replace with a string item, converting it to Weighted with section default itemWeight', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 }).add('Item 0').add('Old Item');
            const newItemText = 'Replaced String Item';

            // Act
            section.replace(1, newItemText);

            // Assert
            expect(section.items.length).toBe(2);
            const replacedItem = section.items[1] as Weighted;
            expect(replacedItem.text).toBe(newItemText);
            expect(replacedItem.weight).toBe(3);
        });

        it('should replace with a string item with explicit options', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section', itemWeight: 3 }).add('Item 0').add('Old Item');
            const newItemText = 'Replaced String Item';

            // Act
            section.replace(1, newItemText, { weight: 8 });

            // Assert
            expect(section.items.length).toBe(2);
            const replacedItem = section.items[1] as Weighted;
            expect(replacedItem.text).toBe(newItemText);
            expect(replacedItem.weight).toBe(8);
        });

        it('should return the section for chaining', () => {
            // Arrange
            const section = create<Weighted>({ title: 'Test Section' }).add('Old Item');

            // Act
            const result = section.replace(0, 'New Item');

            // Assert
            expect(result).toBe(section);
        });
    });
}); 