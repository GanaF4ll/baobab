import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import emojiRegex from 'emoji-regex';

@ValidatorConstraint({ async: false })
export class IsUnicodeEmojiConstraint implements ValidatorConstraintInterface {
  validate(text: string) {
    if (!text || typeof text !== 'string') return false;

    const getEmojiRegexFn =
      typeof emojiRegex === 'function'
        ? emojiRegex
        : (emojiRegex as any)?.default || require('emoji-regex');
    const regex: RegExp = (
      typeof getEmojiRegexFn === 'function' ? getEmojiRegexFn : (getEmojiRegexFn as any).default
    )();
    const matches = text.match(regex);

    if (!matches) return false;

    // Verifies the string is composed only of emojis
    return matches.join('') === text;
  }

  defaultMessage() {
    return 'The icon must be a real emoji character.';
  }
}

export function IsUnicodeEmoji(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUnicodeEmojiConstraint,
    });
  };
}
