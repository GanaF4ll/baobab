import { validate } from 'class-validator';
import { IsUnicodeEmoji, IsUnicodeEmojiConstraint } from 'src/workspaces/validators/emoji.validator';

describe('IsUnicodeEmojiConstraint', () => {
  let constraint: IsUnicodeEmojiConstraint;

  beforeEach(() => {
    constraint = new IsUnicodeEmojiConstraint();
  });

  describe('validate', () => {
    it('should return true for a single simple emoji', () => {
      expect(constraint.validate('😀')).toBe(true);
      expect(constraint.validate('🚀')).toBe(true);
      expect(constraint.validate('🌸')).toBe(true);
    });

    it('should return true for multiple emojis without spaces', () => {
      expect(constraint.validate('😀🚀🌸')).toBe(true);
    });

    it('should return true for complex/composed emojis (ZWJ, skin tone modifiers)', () => {
      expect(constraint.validate('👨‍👩‍👧‍👦')).toBe(true);
      expect(constraint.validate('🧑‍💻')).toBe(true);
      expect(constraint.validate('👍🏽')).toBe(true);
    });

    it('should return false for non-emoji strings', () => {
      expect(constraint.validate('hello')).toBe(false);
      expect(constraint.validate('123')).toBe(false);
      expect(constraint.validate('abc 😀')).toBe(false);
    });

    it('should return false for strings with mixed emojis and text', () => {
      expect(constraint.validate('😀 hello')).toBe(false);
      expect(constraint.validate('hello 😀')).toBe(false);
      expect(constraint.validate('😀a')).toBe(false);
    });

    it('should return false for empty or non-string values', () => {
      expect(constraint.validate('')).toBe(false);
      expect(constraint.validate(null as any)).toBe(false);
      expect(constraint.validate(undefined as any)).toBe(false);
      expect(constraint.validate(123 as any)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct default error message', () => {
      expect(constraint.defaultMessage()).toBe('The icon must be a real emoji character.');
    });
  });
});

describe('IsUnicodeEmoji Decorator', () => {
  class TestDto {
    @IsUnicodeEmoji()
    icon: string;

    constructor(icon: string) {
      this.icon = icon;
    }
  }

  it('should pass validation if the property is a valid emoji', async () => {
    const dto = new TestDto('😀');
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if the property is not a valid emoji', async () => {
    const dto = new TestDto('not-an-emoji');
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('IsUnicodeEmojiConstraint');
    expect(errors[0].constraints?.IsUnicodeEmojiConstraint).toBe(
      'The icon must be a real emoji character.',
    );
  });
});
