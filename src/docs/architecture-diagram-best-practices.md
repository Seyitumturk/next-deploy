# Architecture Diagram Best Practices

## Preventing Text Overlaps with Connection Lines

One common issue in architecture diagrams is connection lines overlapping with text labels, making diagrams harder to read. Our system automatically optimizes connections to prevent these overlaps, but following these best practices will help create clearer diagrams from the start.

### Best Practices for Connection Placement

1. **Use opposing sides for connections**
   - Instead of connecting from top-to-top (T-T), use left-to-right (L-R)
   - Instead of connecting from bottom-to-bottom (B-B), use left-to-right (L-R)
   - Instead of connecting from left-to-left (L-L), use top-to-bottom (T-B)
   - Instead of connecting from right-to-right (R-R), use top-to-bottom (T-B)

   ```
   # Good
   serverA:L -- R:serverB
   serverC:T -- B:serverD
   
   # Avoid
   serverA:T -- T:serverB
   serverC:B -- B:serverD
   ```

2. **Avoid bottom-to-top connections**
   - Bottom-to-top (B-T) connections often cross through service labels
   - Use left-to-right (L-R) connections instead

   ```
   # Good
   serverA:L -- R:serverB
   
   # Avoid
   serverA:B -- T:serverB
   ```

3. **Use junctions for complex routing**
   - For diagrams with many connections, use junctions to route connections
   - This is especially helpful for "hub" services with many connections

   ```
   junction j1
   
   serverA:R -- L:j1
   j1:R -- L:serverB
   serverC:T -- B:j1
   ```

4. **Space services adequately**
   - Give enough horizontal and vertical space between services
   - This allows connection lines to route without overlapping text

5. **Consider connection direction**
   - Use arrows (-->) for directional flow
   - Consistent direction helps understand the diagram flow

### Example - Bad vs. Good

**Problematic Diagram (With Text Overlaps)**
```
architecture-beta
    group cloud_infra(cloud)[Cloud Infrastructure]
    
    service api_gateway(internet)[API Gateway] in cloud_infra
    service webserver(server)[Web Server] in cloud_infra
    service database(database)[Database] in cloud_infra
    
    api_gateway:T -- T:webserver
    webserver:B -- B:database
```

**Improved Diagram (No Text Overlaps)**
```
architecture-beta
    group cloud_infra(cloud)[Cloud Infrastructure]
    
    service api_gateway(internet)[API Gateway] in cloud_infra
    service webserver(server)[Web Server] in cloud_infra
    service database(database)[Database] in cloud_infra
    
    api_gateway:R -- L:webserver
    webserver:R -- L:database
```

## Automatic Optimization

Our system automatically applies these best practices to your diagrams:

1. **Connection Optimization**
   - Same-side connections (T-T, B-B, L-L, R-R) are converted to opposing sides
   - Bottom-to-top connections are converted to left-to-right

2. **Junction Addition**
   - For complex diagrams, junctions are automatically added
   - These help route connections to avoid text overlaps

3. **Syntax Correction**
   - Ensures proper syntax for groups, services, and connections
   - Fixes common errors in architecture diagram syntax

## Architecture Diagram Syntax Reference

```
architecture-beta

# Define groups
group group_name(icon)[Label Text]

# Define services
service service_name(icon)[Label Text] in group_name

# Define junctions
junction junction_name in group_name

# Connect services
service1:L -- R:service2    # Left of service1 to right of service2
service3:T -- B:service4    # Top of service3 to bottom of service4

# Use arrows for direction
service5:R --> L:service6   # Right of service5 to left of service6
```

### Available Icons

- cloud
- database
- disk
- internet
- server

### Connection Points

- T: Top
- B: Bottom
- L: Left
- R: Right 