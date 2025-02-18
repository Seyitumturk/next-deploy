export function serializeMongoObject<T extends { _id?: any }>(obj: T): any {
  if (!obj) return null;

  const serialized = { ...obj };

  // Convert _id if it exists
  if (serialized._id) {
    serialized._id = serialized._id.toString();
  }

  // Convert dates
  for (const [key, value] of Object.entries(serialized)) {
    if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      serialized[key] = value.map(item => 
        typeof item === 'object' ? serializeMongoObject(item) : item
      );
    } else if (value && typeof value === 'object' && value._id) {
      serialized[key] = serializeMongoObject(value);
    }
  }

  return serialized;
}

export function serialize(data: unknown): string {
  // Example implementation: JSON stringify your data.
  return JSON.stringify(data);
} 