Method: POST

URL: http://127.0.0.1:3000/api/orders

Status: 201 Created

Cookies:
  - shoplab.sid: {
    - value: "s:o62lONYWqru86F5UyFfjnPIV3MnPIJRM.GOL6NlUAY8IlIIH7IiJL6z8ZvaXyufHST8CQiwVgMaE",
    - domain: "127.0.0.1",
    - Path: "/",
    - Expires/MaxAge: "Wed, 30 Sep 2026 11:23:47 GMT",
    - Size: 91,
    - HttpOnly: true,
    - Secure: false,
    - SameSite: Lax
  }

Request:
{"items":[{"productId":1,"quantity":2,"unitPrice":89},{"productId":4,"quantity":1,"unitPrice":39}],"total":217}

Response:
{"orderId":1001,"total":217,"status":"paid"}
