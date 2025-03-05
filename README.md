# Coupon System API Documentation

## Base URL
```
https://yourdomain.com/api
```

## Authentication
Admin routes require authentication via the `x-admin-key` header or `adminKey` query parameter.

## Response Format
All responses follow this format:
```json
{
  "status": "success|error",
  "data": {}, // For successful responses
  "message": "Error message" // For error responses
}
```

## Rate Limiting
API is limited to 100 requests per IP address per 15-minute window.

---

## Public Endpoints

### Generate Coupon
Creates a new unique coupon for a user.

**URL**: `/coupon`  
**Method**: `POST`  
**Rate Limit**: Yes  

**Request Body**:
```json
{
  "twitterId": "123456789",
  "username": "user_handle",
  "followers": 1500,
  "role": "creator" // Optional, defaults to "user"
}
```

**Success Response (201 Created)**:
```json
{
  "status": "success",
  "data": {
    "code": "ABC1-DEF2",
    "username": "user_handle",
    "role": "creator"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `409 Conflict`: User already has a coupon

---

### Get Coupon
Retrieves coupon information for a specific Twitter user.

**URL**: `/coupon`  
**Method**: `GET`  
**Rate Limit**: Yes  

**Query Parameters**:
- `twitterId` (required): The Twitter ID of the user

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "couponCode": "ABC1-DEF2",
    "twitterId": "123456789",
    "username": "user_handle",
    "followers": 1500,
    "points": 20,
    "timesUsed": 2,
    "role": "creator",
    "active": true,
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-20T15:30:00.000Z",
    "lastUsedAt": "2023-01-20T15:30:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing parameters
- `404 Not Found`: Coupon not found

---
# Redeem Coupon Endpoint

Redeems a coupon code, awarding points to both the coupon creator and redeemer. Also supports creating a new coupon for first-time users.

**URL**: `/api/redeem`  
**Method**: `POST`  
**Rate Limit**: Yes  

## Request Body

### For Existing Users
```json
{
  "redeemerTwitterId": "987654321",
  "couponCode": "ABC1-DEF2"
}
```

### For New Users
```json
{
  "redeemerTwitterId": "987654321",
  "username": "new_user",
  "followers": 1500,
  "couponCode": "ABC1-DEF2"
}
```

## Success Response

### For Existing Users (200 OK)
```json
{
  "status": "success",
  "message": "Coupon redeemed successfully",
  "data": {
    "creatorPoints": 20,
    "redeemerPoints": 10
  }
}
```

### For New Users (200 OK)
```json
{
  "status": "success",
  "message": "Coupon redeemed successfully",
  "data": {
    "creatorPoints": 20,
    "redeemerPoints": 10,
    "newUser": true,
    "newCouponCode": "XYZ9-ABC8",
    "message": "New coupon created and points awarded"
  }
}
```

## Error Responses

- `400 Bad Request`: Invalid request, self-redemption attempt, or missing fields
- `403 Forbidden`: Role mismatch between creator and redeemer or multiple redemption attempt
- `404 Not Found`: Invalid coupon code

Error example for multiple redemption attempt:
```json
{
  "status": "error",
  "message": "You have already redeemed a coupon before. Each user can only redeem one coupon."
}
```

## Notes

1. For new users (without an existing coupon), the following fields are required:
   - `redeemerTwitterId` - The Twitter ID of the new user
   - `username` - The Twitter username of the new user
   - `followers` - The follower count (minimum 1000)
   - `couponCode` - The coupon code being redeemed

2. New users will:
   - Have a coupon automatically generated for them
   - Be assigned the same role as the coupon owner
   - Receive 10 initial points from the redemption

3. The system prevents:
   - Self-redemption (using your own coupon)
   - Cross-role redemption (creator coupon with user role or vice versa)
   - Redemption with insufficient follower count for new users
   - Multiple redemptions (each user can only redeem one coupon ever)

## Example Usage

### Curl Command for New User Redemption
```bash
curl -X POST http://localhost:3000/api/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "redeemerTwitterId": "987654321",
    "username": "new_user",
    "followers": 1500,
    "couponCode": "ABC1-DEF2"
  }'
```

Redeems a coupon code, awarding points to both the coupon creator and redeemer. Also supports creating a new coupon for first-time users.

**URL**: `/api/redeem`  
**Method**: `POST`  
**Rate Limit**: Yes  

## Request Body

### For Existing Users
```json
{
  "redeemerTwitterId": "987654321",
  "couponCode": "ABC1-DEF2"
}
```

### For New Users
```json
{
  "redeemerTwitterId": "987654321",
  "username": "new_user",
  "followers": 1500,
  "couponCode": "ABC1-DEF2"
}
```

## Success Response

### For Existing Users (200 OK)
```json
{
  "status": "success",
  "message": "Coupon redeemed successfully",
  "data": {
    "creatorPoints": 20,
    "redeemerPoints": 10
  }
}
```

### For New Users (200 OK)
```json
{
  "status": "success",
  "message": "Coupon redeemed successfully",
  "data": {
    "creatorPoints": 20,
    "redeemerPoints": 10,
    "newUser": true,
    "newCouponCode": "XYZ9-ABC8",
    "message": "New coupon created and points awarded"
  }
}
```

## Error Responses

- `400 Bad Request`: Invalid request, self-redemption attempt, or missing fields
- `403 Forbidden`: Role mismatch between creator and redeemer
- `404 Not Found`: Invalid coupon code

## Notes

1. For new users (without an existing coupon), the following fields are required:
   - `redeemerTwitterId` - The Twitter ID of the new user
   - `username` - The Twitter username of the new user
   - `followers` - The follower count (minimum 1000)
   - `couponCode` - The coupon code being redeemed

2. New users will:
   - Have a coupon automatically generated for them
   - Be assigned the same role as the coupon owner
   - Receive 10 initial points from the redemption

3. The system prevents:
   - Self-redemption (using your own coupon)
   - Cross-role redemption (creator coupon with user role or vice versa)
   - Redemption with insufficient follower count for new users

## Example Usage

### Curl Command for New User Redemption
```bash
curl -X POST http://localhost:3000/api/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "redeemerTwitterId": "987654321",
    "username": "new_user",
    "followers": 1500,
    "couponCode": "ABC1-DEF2"
  }'
```
## Admin Endpoints

All admin endpoints require authentication using the `x-admin-key` header.

### List All Coupons
Retrieves a paginated list of all coupons with optional filtering.

**URL**: `/admin/coupons`  
**Method**: `GET`  
**Authentication**: Required  

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `role` (optional): Filter by role ("creator" or "user")
- `minFollowers` (optional): Filter by minimum followers count
- `username` (optional): Filter by username (partial match)

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "coupons": [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "couponCode": "ABC1-DEF2",
        "twitterId": "123456789",
        "username": "user_handle",
        "followers": 1500,
        "points": 20,
        "timesUsed": 2,
        "role": "creator",
        "active": true,
        "createdAt": "2023-01-15T12:00:00.000Z",
        "updatedAt": "2023-01-20T15:30:00.000Z"
      },
      // More coupons...
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "pages": 3,
      "limit": 20
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication

---

### System Statistics
Gets system-wide statistics about the coupon system.

**URL**: `/admin/stats`  
**Method**: `GET`  
**Authentication**: Required  

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "totalCoupons": 45,
    "roleDistribution": {
      "creators": 30,
      "users": 15
    },
    "totalRedeemed": 128,
    "mostUsedCoupon": {
      "couponCode": "ABC1-DEF2",
      "username": "user_handle",
      "twitterId": "123456789",
      "timesUsed": 24,
      "points": 240
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication

---

### Delete Coupon
Deletes a specific coupon by ID.

**URL**: `/admin/coupon/:couponId`  
**Method**: `DELETE`  
**Authentication**: Required  

**URL Parameters**:
- `couponId` (required): MongoDB ObjectId of the coupon

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Coupon deleted successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication
- `404 Not Found`: Coupon not found

---

## Error Codes

| Status Code | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| 400         | Bad Request - Invalid input data or parameters              |
| 401         | Unauthorized - Authentication required                      |
| 403         | Forbidden - Invalid credentials or insufficient permissions |
| 404         | Not Found - Resource not found                              |
| 409         | Conflict - Resource already exists                          |
| 429         | Too Many Requests - Rate limit exceeded                     |
| 500         | Internal Server Error - Server error                        |

---

## Development and Testing
For development, use the base URL: `http://localhost:3000/api`

You can test the API using tools like Postman or curl.

Example curl command to create a coupon:
```bash
curl -X POST http://localhost:3000/api/coupon \
  -H "Content-Type: application/json" \
  -d '{"twitterId":"123456789","username":"user_handle","followers":1500,"role":"creator"}'
```

# Access Code System API Documentation

## Overview
The Access Code system provides beta access management through unique 6-digit alphanumeric codes. These codes can be generated by administrators and redeemed by users to gain access to beta features.

---

## Public Endpoints

### Validate Access Code
Validates an access code without redeeming it.

**URL**: `/api/access-code/validate/:code`  
**Method**: `GET`  
**Rate Limit**: Yes  

**URL Parameters**:
- `code` (required): The 6-digit access code to validate

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Access code is valid",
  "valid": true,
  "data": {
    "description": "Beta access code",
    "expiresAt": "2023-12-31T23:59:59.999Z",
    "remainingUses": 40,
    "usedCount": 10
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing code
- `404 Not Found`: Invalid access code
- `403 Forbidden`: Access code expired or inactive

Invalid access code response example:
```json
{
  "status": "error",
  "message": "Invalid access code",
  "valid": false
}
```

---

### Redeem Access Code
Redeems an access code and records the username who used it.

**URL**: `/api/access-code/redeem`  
**Method**: `POST`  
**Rate Limit**: Yes  

**Request Body**:
```json
{
  "code": "ABC123",
  "username": "user_handle"
}
```

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Access code redeemed successfully",
  "data": {
    "description": "Beta access code",
    "active": true
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Invalid access code
- `403 Forbidden`: Access code expired, inactive, or already used by this user

Error examples:
```json
{
  "status": "error",
  "message": "Access code has expired"
}
```
```json
{
  "status": "error",
  "message": "You have already used this access code"
}
```

---

### Check User Access Code Redemptions
Checks if a user has redeemed any access codes.

**URL**: `/api/access-code/user/:username`  
**Method**: `GET`  
**Rate Limit**: Yes  

**URL Parameters**:
- `username` (required): The username of the user

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "hasRedeemedAccessCode": true,
    "accessCodes": [
      {
        "code": "ABC123",
        "description": "Beta access code",
        "expiresAt": "2023-12-31T23:59:59.999Z",
        "createdAt": "2023-01-15T12:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing username

---

## Admin Endpoints

All admin endpoints require authentication using the `x-admin-key` header.

### Create Access Code
Creates a new access code with specified parameters.

**URL**: `/admin/access-code`  
**Method**: `POST`  
**Authentication**: Required  

**Request Body**:
```json
{
  "description": "Beta Tester Access Code",
  "maxUses": 50,
  "expiryDays": 30
}
```

**Success Response (201 Created)**:
```json
{
  "status": "success",
  "data": {
    "accessCode": {
      "code": "ABC123",
      "description": "Beta Tester Access Code",
      "maxUses": 50,
      "expiresAt": "2023-12-31T23:59:59.999Z",
      "active": true
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication

---

### List Access Codes
Retrieves a paginated list of all access codes with optional filtering.

**URL**: `/admin/access-codes`  
**Method**: `GET`  
**Authentication**: Required  

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `active` (optional): Filter by active status ("true" or "false")
- `expired` (optional): Filter by expiry status ("true" or "false")
- `code` (optional): Filter by code (partial match)

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "accessCodes": [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "code": "ABC123",
        "description": "Beta Tester Access Code",
        "maxUses": 50,
        "usedCount": 10,
        "expiresAt": "2023-12-31T23:59:59.999Z",
        "active": true,
        "createdAt": "2023-01-15T12:00:00.000Z",
        "createdBy": "admin",
        "usedBy": [
          {
            "twitterId": "123456789",
            "username": "user_handle",
            "redeemedAt": "2023-01-20T15:30:00.000Z"
          }
        ]
      },
      // More access codes...
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "pages": 1,
      "limit": 20
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication

---

### Get Access Code Details
Gets detailed information about a specific access code, including usage statistics.

**URL**: `/admin/access-code/:code`  
**Method**: `GET`  
**Authentication**: Required  

**URL Parameters**:
- `code` (required): The access code

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "accessCode": {
      "code": "ABC123",
      "description": "Beta Tester Access Code",
      "maxUses": 50,
      "usedCount": 10,
      "expiresAt": "2023-12-31T23:59:59.999Z",
      "active": true,
      "createdAt": "2023-01-15T12:00:00.000Z",
      "createdBy": "admin",
      "usedBy": [
        {
          "twitterId": "123456789",
          "username": "user_handle",
          "redeemedAt": "2023-01-20T15:30:00.000Z"
        }
      ],
      "stats": {
        "usagePercentage": 20.00,
        "isExpired": false,
        "isUsable": true,
        "remainingUses": 40,
        "daysUntilExpiry": 30
      }
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication
- `404 Not Found`: Access code not found

---

### Deactivate Access Code
Deactivates an access code to prevent further use.

**URL**: `/admin/access-code/:code/deactivate`  
**Method**: `PATCH`  
**Authentication**: Required  

**URL Parameters**:
- `code` (required): The access code to deactivate

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Access code deactivated successfully",
  "data": {
    "code": "ABC123",
    "active": false
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication
- `404 Not Found`: Access code not found

---

### Activate Access Code
Reactivates a previously deactivated access code.

**URL**: `/admin/access-code/:code/activate`  
**Method**: `PATCH`  
**Authentication**: Required  

**URL Parameters**:
- `code` (required): The access code to activate

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Access code activated successfully",
  "data": {
    "code": "ABC123",
    "active": true
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication
- `404 Not Found`: Access code not found
- `400 Bad Request`: Cannot activate (expired or max uses reached)

---

### Delete Access Code
Permanently deletes an access code.

**URL**: `/admin/access-code/:code`  
**Method**: `DELETE`  
**Authentication**: Required  

**URL Parameters**:
- `code` (required): The access code to delete

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Access code deleted successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication
- `404 Not Found`: Access code not found

---

### Access Code Statistics
Gets system-wide statistics about the access code system.

**URL**: `/admin/access-code-stats`  
**Method**: `GET`  
**Authentication**: Required  

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "totalAccessCodes": 12,
    "activeAccessCodes": 8,
    "expiredAccessCodes": 2,
    "fullyUsedAccessCodes": 2,
    "totalUsages": 245,
    "mostUsedCode": {
      "code": "ABC123",
      "description": "Beta Tester Access Code",
      "usedCount": 50,
      "maxUses": 50
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Invalid authentication

---

## Example Usage

### Curl Command for Creating Access Code (Admin)
```bash
curl -X POST http://localhost:3000/admin/access-code \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "description": "Beta Tester Access Code",
    "maxUses": 50,
    "expiryDays": 30
  }'
```

### Curl Command for Redeeming Access Code (User)
```bash
curl -X POST http://localhost:3000/api/access-code/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123",
    "username": "user_handle"
  }'
```