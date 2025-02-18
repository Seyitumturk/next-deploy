export function serializeMongoObject<T extends { _id?: any }>(obj: T): any {
  if (!obj) return null;

  // Cast the spread object to allow indexing by string keys
  const serialized = { ...obj } as Record<string, any>;

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

export function serialize<T>(data: T): string {
  return JSON.stringify(data);
} 