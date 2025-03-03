/**
 * Test case for architecture diagram text overlap prevention
 * This file demonstrates how our optimized connection handling prevents text overlaps
 */

// Example architecture diagram with potential text overlaps
const problematicDiagram = `
mermaid
architecture-beta
    group cloud_infra(cloud)[Cloud Infrastructure]
    
    service api_gateway(internet)[API Gateway] in cloud_infra
    service webserver(server)[Web Server] in cloud_infra
    service auth_service(server)[Auth Service] in cloud_infra
    service database(database)[Database] in cloud_infra
    service storage(disk)[Storage] in cloud_infra
    
    api_gateway:T -- T:webserver
    webserver:L -- L:auth_service
    auth_service:B -- B:database
    webserver:B -- B:database
    webserver:L -- L:storage
`;

// How our system will optimize it - for reference
const optimizedDiagram = `
mermaid
architecture-beta
%% Optimized for preventing text/line overlaps
%% Using junctions to avoid complex connection overlaps
    group cloud_infra(cloud)[Cloud Infrastructure]
    
    service api_gateway(internet)[API Gateway] in cloud_infra
    service webserver(server)[Web Server] in cloud_infra
    service auth_service(server)[Auth Service] in cloud_infra
    service database(database)[Database] in cloud_infra
    service storage(disk)[Storage] in cloud_infra
    
    junction junction_1 in cloud_infra
    
    api_gateway:L -- R:webserver
    webserver:T -- B:auth_service
    auth_service:R -- L:junction_1
    database:T -- B:junction_1
    webserver:R -- L:storage
`;

/**
 * How the optimizations work:
 * 
 * 1. Same-side connections (T-T, B-B, L-L, R-R) are converted to opposite sides:
 *    - T-T becomes L-R (horizontal instead of both from top)
 *    - B-B becomes L-R (horizontal instead of both from bottom)
 *    - L-L becomes T-B (vertical instead of both from left)
 *    - R-R becomes T-B (vertical instead of both from right)
 * 
 * 2. For complex diagrams with many connections or hub nodes:
 *    - Junctions are automatically added to route connections
 *    - This prevents crossing lines from overlapping with text
 * 
 * 3. Special handling for B-T connections:
 *    - Bottom-to-top connections often overlap with text
 *    - These are converted to L-R connections when possible
 */

// To test this functionality manually:
// 1. Create a problematic architecture diagram in the app
// 2. Note the text overlaps with connection lines
// 3. After our changes, the connections should be routed to avoid text overlaps 