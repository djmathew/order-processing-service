# Serverless Order Processing Service

## Part 1: Infrastructure as Code using AWS CDK
### Prerequisites
Ensure you have the following installed before proceeding:

- **AWS CLI** (configured with credentials) → [Install Guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- **Node.js (>= 16.x)** → [Download](https://nodejs.org/)
- **AWS CDK (>= 2.x)** → Install globally:
    ```sh
    npm install -g aws-cdk
    ```
- **git**
  
### Set Up

```bash

### retrieve code from git/zip
git clone <repo>
```


### Deploying the CDK Stack

```bash
# Open working directory
cd order-processing-service

# Bootstrap AWS CDK (only required for the first deployment):
cdk bootstrap

# Synthesis and deploy the stack
cdk deploy

```

### Running Basic Unit Tests with Jest

```bash
npm install --save-dev jest @types/jest ts-jest aws-cdk-lib constructs

npm test
```

### Clean up the CDK Stack
```bash
# Destroy the stack
cdk destroy
```

## Part 2: CI/CD & Deployment Strategy

### Steps for Implementing CI/CD
 
#### Assumptions for building CI/CD Pipeline using Azure DevOps

To ensure a smooth deployment process for the Serverless Order Processing Service, we will implement a CI/CD pipeline using Azure DevOps. The pipeline should:

- Listen for code changes merged to specific branch in code repository (say main branch in git or any other)
- Build and test the CDK infrastructure code
- Deploy the AWS infrastructure using AWS CDK.
- Build and push the Docker container to Amazon ECR.
- Deploy the ECS services and update the application.

Based on these assumptions we will need 3 pipelines.

#### Steps 

1. **Infrastructure as Code (IaC) Pipeline**
   - Lint check IaC
   - Deploys AWS infrastructure using AWS CDK.
   - Tests to ensure all resources like VPC, RDS, ECS, ALB, and security groups are created.

2. **Order Processing Service (Container 1) Pipeline**
   - Builds and pushes the container for the **QueueProcessingFargateService** (SQS worker) to a container registry.
   - Deploys and updates the ECS task definition.

3. **Web Application (Container 2) Pipeline**
   - Builds and pushes the container for the **ApplicationLoadBalancedFargateService** (web traffic handler) to a container registry.
   - Deploys and updates the ECS service behind the ALB.


### Handling Database Migrations Safely

In most cases we will try to include the Database migrations within the application. Otherwise to ensure smooth database migrations:

- Use **AWS RDS Parameter Groups** to apply safe changes.
- Apply schema migrations using tools like **Liquibase** or **Flyway** in the deployment pipeline.
- Enable **RDS Automated Backups** and **Multi-AZ Deployment** to prevent data loss.
- Apply database migrations before updating application containers.

### Managing Secrets Securely

To securely store and retrieve secrets like database credentials and API keys we need to use a secret manager:

- **AWS Secrets Manager**: Store RDS credentials and other sensitive information securely.
- **IAM Policies**: Grant the ECS task role permissions to retrieve secrets.
- **AWS Systems Manager Parameter Store**: Store non-sensitive configuration values.
- **Environment Variables**: Environment variables in the pipeline to avoid hardcoding credentials in the application.

---

## Part 3: Observability & Security

### Monitoring and Logging Strategy

To ensure observability, we can either use third party solutions or AWS native solutions. Keeping cost in mind the following AWS native services are being considered:

- **Amazon CloudWatch**
  - Monitor ECS task metrics (CPU, memory, network usage).
  - RDS (CPU, memory, network usage, storage usage and storage autoscaling)
  - Set up custom CloudWatch Alarms for high error rates.
- **AWS X-Ray**
  - Enable distributed tracing for ECS services.
- **Amazon RDS Performance Insights**
  - Track slow queries and performance bottlenecks.
- **Logging**
  - Setup a centralized account to collect all logs.
  - Enable and configure ALB access logs.
  - Enable and configure VPC Flow logs
  - Enable and configure log driver at the container level for the ECS services
  - Use AWS Athena to analyze request trends.

### Security Risks and Mitigations

| Risk                              | Mitigation                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Public ALB exposure               | Restrict ALB security group to only allow incoming traffic on ports 80/443. With domain name we can enforce only 443 traffic   |
| ECS unrestricted outbound traffic | Use restrictive outbound rules to allow traffic only to required AWS services. |
| RDS exposed to VPC                | Restrict RDS access to only ECS security group. This is implemented                                |
| Secret leakage in logs            | Use AWS Secrets Manager and avoid logging sensitive data.                      |
| Unauthorized API access           | Implement AWS IAM policies for least privilege access.                         |
| Lack of TLS encryption            | Enforce TLS for ALB and database connections.                                  |

### Additional Security Measures

- **AWS WAF**: Protect ALB from malicious requests.
- **Amazon GuardDuty**: Enable threat detection for AWS resources.
- **AWS Security Hub**: Enable centralized security posture management.

- **AWS Config**: Ensure compliance by continuously monitoring configuration changes.
- **IAM Least Privilege Access**: Restrict access to resources using least privilege policies.
- **Amazon RDS** - enable automatic password rotation via Amazon Secret manager