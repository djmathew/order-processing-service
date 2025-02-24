import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class OrderProcessingServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create a VPC (Networking for RDS and ECS)
        const vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 3, // Spread resources across 3 Availability Zones
            subnetConfiguration: [
                {
                    cidrMask: 24, // Defines the IP range size
                    name: 'PublicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'PrivateAppSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 24,
                    name: 'DatabaseSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                }
            ]
        });

        //Create the ECS Security Group
        const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
            vpc,
            description: 'Security group for ECS tasks',
            allowAllOutbound: true // ECS can access the internet
        });        

        //Create the RDS Security Group
        const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
            vpc,
            description: 'Security group for RDS database',
            allowAllOutbound: false // Restricts outgoing traffic (optional)
        });

        //Allow Only ECS to Access RDS on Port 5432
        rdsSecurityGroup.addIngressRule(
            ecsSecurityGroup, // Allow only traffic from ECS security group
            ec2.Port.tcp(5432), // PostgreSQL runs on port 5432
            'Allow ECS to access RDS'
        );

        //Allow RDS to Respond to ECS Traffic
        rdsSecurityGroup.addEgressRule(
            ecsSecurityGroup,
            ec2.Port.tcp(5432),
            'Allow RDS to respond to ECS traffic'
        );

        // Create RDS PostgreSQL Database
        const database = new rds.DatabaseInstance(this, 'PostgresDB', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO), vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            multiAz: false, // For multi-AZ set multiAz: true
            allocatedStorage: 20, // Initial storage (20GB)
            maxAllocatedStorage: 100, // Storage auto-scales up to 100GB

            securityGroups: [rdsSecurityGroup], // Assigns the RDS security group
            credentials: rds.Credentials.fromGeneratedSecret('dbadmin'), // The master password is securely stored in AWS Secrets Manager. An app_user needs to be created
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // Create an SQS Queue for Order Processing
        const queue = new sqs.Queue(this, 'OrderQueue');

        // Create an ECS Cluster
        const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

        // ECS Service for Processing Messages from SQS Queue
        new ecsPatterns.QueueProcessingFargateService(this, 'EcsService', {
            cluster,
            cpu: 256,
            memoryLimitMiB: 512,
            image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'), 
            queue,
            deploymentController: {
                type: ecs.DeploymentControllerType.ECS, // Standard ECS deployment type
            },
            minHealthyPercent: 100, // Ensure 100% of tasks remain healthy during deployment
            maxHealthyPercent: 200, // Allow up to 200% of desired tasks (optional)
        
        });

        // Define the ECS service with an automatically created ALB
        new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'LoadBalancedService', {
            cluster,
            cpu: 256,
            memoryLimitMiB: 512,
            desiredCount: 2, // Running 2 tasks for load balancing
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample')                
            },
//            securityGroups: [ecsSecurityGroup], // Attach the ECS security group (only allows traffic from ALB)
            securityGroups: [], // Attach the ECS security group (only allows traffic from ALB)
            publicLoadBalancer: true,  // This ensures the ALB is publicly accessible
            minHealthyPercent: 100, // Ensure 100% of tasks remain healthy during deployment
            maxHealthyPercent: 200, // Allow up to 200% of desired tasks (optional)

        });
    }
}