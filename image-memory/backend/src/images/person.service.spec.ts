import { Test, TestingModule } from '@nestjs/testing';
import { PersonService } from './person.service';
import { DetectedPerson, PersonRecord } from './types/image-memory.types';

describe('PersonService', () => {
  let service: PersonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonService],
    }).compile();

    service = module.get<PersonService>(PersonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolvePeople', () => {
    it('should create a new person if no match is found', () => {
      const detected: DetectedPerson[] = [
        {
          personId: '',
          descriptors: ['tall', 'blue hat'],
          embedText: 'A tall person with a blue hat',
        },
      ];
      const existing: Record<string, PersonRecord> = {};
      const result = service.resolvePeople(detected, existing, 'img-1', '2024-01-01');

      expect(Object.keys(result.updatedPeople)).toHaveLength(1);
      expect(result.resolvedPersonIds).toHaveLength(1);
      const newPerson = Object.values(result.updatedPeople)[0];
      expect(newPerson.canonicalDescriptors).toContain('blue hat');
    });

    it('should match an existing person based on descriptor overlap', () => {
      const personId = 'existing-1';
      const existing: Record<string, PersonRecord> = {
        [personId]: {
          personId,
          canonicalDescriptors: ['tall', 'blue hat', 'glasses'],
          embedText: 'Someone tall with blue hat and glasses',
          imageIds: ['img-0'],
          firstSeen: '2024-01-01',
          lastSeen: '2024-01-01',
          moodHistory: [],
        },
      };

      const detected: DetectedPerson[] = [
        {
          personId: '',
          descriptors: ['tall', 'blue hat'], // 2/3 overlap
          embedText: 'A tall person with a blue hat',
        },
      ];

      const result = service.resolvePeople(detected, existing, 'img-1', '2024-01-02');
      expect(result.resolvedPersonIds[0]).toBe(personId);
      expect(result.updatedPeople[personId].imageIds).toContain('img-1');
    });
  });
});
