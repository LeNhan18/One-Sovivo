# ESG Images Directory

This directory contains images for ESG (Environmental, Social, Governance) programs.

## Structure

```
static/images/esg/
├── environment/     # Environmental programs images
├── social/          # Social programs images
├── governance/      # Governance programs images
└── README.md        # This file
```

## Image Guidelines

All ESG program images should follow these guidelines:

### Technical Specifications
- **Format**: JPG or PNG
- **Size**: 800x600 pixels (4:3 aspect ratio preferred)
- **File size**: < 500KB for optimal web loading
- **Quality**: High quality, professional appearance

### Content Guidelines
- Images should be relevant to the specific ESG program
- Use professional, clean, and inspiring visuals
- Avoid copyrighted images - use stock photos or original content
- Consider Vietnamese cultural context when appropriate

### Naming Convention
- Use descriptive, lowercase filenames
- Use hyphens instead of spaces
- Include file extension (.jpg or .png)
- Example: `vietnam-forest.jpg`, `healthcare-center.png`

## Current Programs

### Environment (3 programs)
- Trồng Rừng Việt Nam
- Làm Sạch Sông Mekong  
- Năng Lượng Mặt Trời Nông Thôn

### Social (4 programs)
- Học Bổng Sinh Viên Vùng Cao
- Trung Tâm Y Tế Cộng Đồng
- Kỹ Năng Số Cho Người Cao Tuổi
- Nước Sạch Cho Trẻ Em

### Governance (3 programs)
- Minh Bạch Doanh Nghiệp
- Đào Tạo Đạo Đức Kinh Doanh
- Bảo Vệ Quyền Người Lao Động

## Usage

Images are referenced in the database using paths like:
- `/static/images/esg/environment/vietnam-forest.jpg`
- `/static/images/esg/social/healthcare.jpg`
- `/static/images/esg/governance/transparency.jpg`

The Flask application serves these static files automatically.